namespace Device_Simulator_API.Models;

public enum RunState
{
    Idle,
    Running,
    Stopped,
    Faulted
}
 
public class RunStatus
{
    public required string DeviceId { get; set; }
    public Guid? RunId { get; set; }
    public RunState Status { get; set; } = RunState.Idle;
    public DateTime? StartedAt { get; set; }
    public DateTime? StoppedAt { get; set; }
}
