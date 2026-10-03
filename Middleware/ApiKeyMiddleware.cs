namespace DeviceSimulator.Api.Middleware;
 
public class ApiKeyMiddleware
{
    private const string ApiKeyHeaderName = "X-Api-Key";
    private readonly RequestDelegate _next;
 
    public ApiKeyMiddleware(RequestDelegate next)
    {
        _next = next;
    }
 
    public async Task InvokeAsync(HttpContext context, IConfiguration configuration)
    {
        var path = context.Request.Path;
 
        var isPublic =
            (context.Request.Method == HttpMethods.Get && path.Equals("/api/devices", StringComparison.OrdinalIgnoreCase)) ||
            path.StartsWithSegments("/hubs") ||
            path.StartsWithSegments("/swagger");
 
        if (isPublic)
        {
            await _next(context);
            return;
        }
 
        var expectedKey = configuration["ApiKey"];
 
        if (!context.Request.Headers.TryGetValue(ApiKeyHeaderName, out var providedKey) ||
            providedKey != expectedKey)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Missing or invalid API key" });
            return;
        }
 
        await _next(context);
    }
}