using DeviceSimulator.Api.Models;
using DeviceSimulator.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DeviceSimulator.Api.Controllers;

[ApiController]
[Route("api/devices")]
public class DevicesController : ControllerBase
{
    private readonly IDeviceRunService _runService;

    public DevicesController(IDeviceRunService runService)
    {
        _runService = runService;
    }

    [HttpGet]
    public ActionResult<IReadOnlyList<Device>> ListDevices()
    {
        return Ok(_runService.ListDevices());
    }

    [HttpPost("{deviceId}/start")]
    public ActionResult<RunStatus> StartRun(string deviceId, [FromBody] StartRunRequest? request)
    {
        if (!_runService.DeviceExists(deviceId))
        {
            return NotFound();
        }

        try
        {
            var status = _runService.StartRun(deviceId, request ?? new StartRunRequest());
            return Accepted(status);
        }
        catch (InvalidOperationException)
        {
            return Conflict();
        }
    }

    [HttpPost("{deviceId}/stop")]
    public ActionResult<RunStatus> StopRun(string deviceId)
    {
        if (!_runService.DeviceExists(deviceId))
        {
            return NotFound();
        }

        try
        {
            return Ok(_runService.StopRun(deviceId));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException)
        {
            return Conflict();
        }
    }

    [HttpGet("{deviceId}/status")]
    public ActionResult<RunStatus> GetStatus(string deviceId)
    {
        if (!_runService.DeviceExists(deviceId))
        {
            return NotFound();
        }

        return Ok(_runService.GetStatus(deviceId));
    }

    [HttpGet("{deviceId}/results")]
    public ActionResult<ResultsResponse> GetResults(string deviceId, [FromQuery] Guid? runId)
    {
        if (!_runService.DeviceExists(deviceId))
        {
            return NotFound();
        }

        var results = _runService.GetResults(deviceId, runId);
        return results is null ? NotFound() : Ok(results);
    }
}