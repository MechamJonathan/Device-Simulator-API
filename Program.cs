using System.Text.Json.Serialization;
using DeviceSimulator.Api.Hubs;
using DeviceSimulator.Api.Middleware;
using DeviceSimulator.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();

// Run state lives in memory, so the service must outlive individual requests.
builder.Services.AddSingleton<IDeviceRunService, DeviceRunService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseMiddleware<ApiKeyMiddleware>();

app.MapControllers();
app.MapHub<TelemetryHub>("/hubs/telemetry");

app.Run();
