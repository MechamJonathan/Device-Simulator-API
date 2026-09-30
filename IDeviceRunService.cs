using DeviceSimulator.Api.Models;

namespace DeviceSimulator.Api.Services;
 
public interface IDeviceRunService
{
    IReadOnlyList<Device> ListDevices();
    bool DeviceExists(string deviceId);
    RunStatus StartRun(string deviceId, StartRunRequest request);
    RunStatus StopRun(string deviceId);
    RunStatus GetStatus(string deviceId);
    ResultsResponse? GetResults(string deviceId, Guid? runId);
}