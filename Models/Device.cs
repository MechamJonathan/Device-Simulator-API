namespace DeviceSimulator.Api.Models;

public class Device
{
    public required string DeviceId { get; set; }
    public required string Profile { get; set; }
    public required string Description { get; set; }
}
