namespace DeviceSimulator.Api.Models;
 
public class ReadingValue
{
    public required string Type { get; set; }
    public double Value { get; set; }
    public required string Unit { get; set; }
}
 
public enum ReadingStatus
{
    Ok,
    Warning,
    Fault
}
 
public class TelemetryReading
{
    public required string DeviceId { get; set; }
    public Guid RunId { get; set; }
    public int SequenceNumber { get; set; }
    public DateTime Timestamp { get; set; }
    public required ReadingValue Reading { get; set; }
    public ReadingStatus Status { get; set; } = ReadingStatus.Ok;
}