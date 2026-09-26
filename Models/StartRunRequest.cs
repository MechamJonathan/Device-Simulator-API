namespace Device_Simulator_API.Models;

public class StartRunRequest
{
    public bool SimulateDisconnect { get; set; } = false;
    public bool MalformedPayload { get; set; } = false;
    public int LatencyMs { get; set; } = 0;
}
