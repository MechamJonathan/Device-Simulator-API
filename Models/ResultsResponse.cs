namespace DeviceSimulator.Api.Models;
 
public class ResultsResponse
{
    public required string DeviceId { get; set; }
    public Guid RunId { get; set; }
    public int Count => Readings.Count;
    public List<TelemetryReading> Readings { get; set; } = new();
}