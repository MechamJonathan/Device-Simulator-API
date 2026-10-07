using System.Collections.Concurrent;
using DeviceSimulator.Api.Hubs;
using DeviceSimulator.Api.Models;
using Microsoft.AspNetCore.SignalR;

namespace DeviceSimulator.Api.Services;

public class DeviceRunService : IDeviceRunService
{
    private static readonly List<Device> KnownDevices = new()
    {
        new Device { DeviceId = "analyzer-01", Profile = "temperature", Description = "Simulated thermal analyzer" },
        new Device { DeviceId = "analyzer-02", Profile = "opticalDensity", Description = "Simulated optical density reader" },
        new Device { DeviceId = "analyzer-03", Profile = "pressure", Description = "Simulated pressure sensor" }
    };

    private readonly ConcurrentDictionary<string, ActiveRun> _runs = new();
    private readonly IHubContext<TelemetryHub> _hubContext;

    public DeviceRunService(IHubContext<TelemetryHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public IReadOnlyList<Device> ListDevices() => KnownDevices;

    public bool DeviceExists(string deviceId) => KnownDevices.Any(d => d.DeviceId == deviceId);

    public RunStatus StartRun(string deviceId, StartRunRequest request)
    {
        var device = KnownDevices.First(d => d.DeviceId == deviceId);

        if (_runs.TryGetValue(deviceId, out var existing) && existing.Status.Status == RunState.Running)
        {
            throw new InvalidOperationException("Device already running");
        }

        var runId = Guid.NewGuid();
        var cts = new CancellationTokenSource();

        var run = new ActiveRun
        {
            Status = new RunStatus
            {
                DeviceId = deviceId,
                RunId = runId,
                Status = RunState.Running,
                StartedAt = DateTime.UtcNow
            },
            Readings = new List<TelemetryReading>(),
            Cts = cts
        };

        _runs[deviceId] = run;

        _ = Task.Run(() => RunLoopAsync(deviceId, runId, device.Profile, request, cts.Token));

        return run.Status;
    }

    public RunStatus StopRun(string deviceId)
    {
        if (!_runs.TryGetValue(deviceId, out var run))
        {
            throw new KeyNotFoundException("Device has no run history");
        }

        if (run.Status.Status != RunState.Running)
        {
            throw new InvalidOperationException("Device is not currently running");
        }

        run.Cts.Cancel();
        run.Status.Status = RunState.Stopped;
        run.Status.StoppedAt = DateTime.UtcNow;

        return run.Status;
    }

    public RunStatus GetStatus(string deviceId)
    {
        if (_runs.TryGetValue(deviceId, out var run))
        {
            return run.Status;
        }

        return new RunStatus { DeviceId = deviceId, Status = RunState.Idle };
    }

    public ResultsResponse? GetResults(string deviceId, Guid? runId)
    {
        if (!_runs.TryGetValue(deviceId, out var run))
        {
            return null;
        }

        // Only the most recent run is kept in memory for this project's scope.
        if (runId.HasValue && run.Status.RunId != runId.Value)
        {
            return null;
        }

        return new ResultsResponse
        {
            DeviceId = deviceId,
            RunId = run.Status.RunId!.Value,
            Readings = SnapshotReadings(run)
        };
    }

    private async Task RunLoopAsync(string deviceId, Guid runId, string profile, StartRunRequest request, CancellationToken token)
    {
        var sequenceNumber = 0;

        while (!token.IsCancellationRequested)
        {
            if (request.LatencyMs > 0)
            {
                try { await Task.Delay(request.LatencyMs, token); }
                catch (TaskCanceledException) { return; }
            }

            var reading = GenerateReading(deviceId, runId, profile, sequenceNumber);
            sequenceNumber++;

            if (_runs.TryGetValue(deviceId, out var run) && run.Status.RunId == runId)
            {
                lock (run.Readings)
                {
                    run.Readings.Add(reading);
                }
            }

            // Every 4th message is intentionally malformed when the flag is set,
            // so contract-validation tests have something real to catch.
            object payload = request.MalformedPayload && sequenceNumber % 4 == 0
                ? new { deviceId, runId }
                : reading;

            await _hubContext.Clients.Group(TelemetryHub.GroupName(deviceId))
                .SendAsync("ReceiveTelemetry", payload, token);

            if (request.SimulateDisconnect && sequenceNumber == 5)
            {
                if (_runs.TryGetValue(deviceId, out var faultedRun) && faultedRun.Status.RunId == runId)
                {
                    faultedRun.Status.Status = RunState.Faulted;
                }
                return;
            }

            try { await Task.Delay(1000, token); }
            catch (TaskCanceledException) { return; }
        }
    }

    private static List<TelemetryReading> SnapshotReadings(ActiveRun run)
    {
        lock (run.Readings)
        {
            return run.Readings.ToList();
        }
    }

    private TelemetryReading GenerateReading(string deviceId, Guid runId, string profile, int sequenceNumber)
    {
        var (value, unit) = profile switch
        {
            "temperature" => (20 + Random.Shared.NextDouble() * 15, "C"),
            "opticalDensity" => (Random.Shared.NextDouble() * 2, "OD"),
            "pressure" => (95 + Random.Shared.NextDouble() * 10, "kPa"),
            _ => (Random.Shared.NextDouble(), "unit")
        };

        return new TelemetryReading
        {
            DeviceId = deviceId,
            RunId = runId,
            SequenceNumber = sequenceNumber,
            Timestamp = DateTime.UtcNow,
            Reading = new ReadingValue { Type = profile, Value = Math.Round(value, 2), Unit = unit },
            Status = ReadingStatus.Ok
        };
    }

    private class ActiveRun
    {
        public required RunStatus Status { get; set; }
        public required List<TelemetryReading> Readings { get; set; }
        public required CancellationTokenSource Cts { get; set; }
    }
}