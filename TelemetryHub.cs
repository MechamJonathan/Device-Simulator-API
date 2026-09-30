using Microsoft.AspNetCore.SignalR;
 
namespace DeviceSimulator.Api.Hubs;
 
public class TelemetryHub : Hub
{
    public async Task SubscribeToDevice(string deviceId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(deviceId));
    }
 
    public async Task UnsubscribeFromDevice(string deviceId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(deviceId));
    }
 
    public static string GroupName(string deviceId) => $"device:{deviceId}";
}