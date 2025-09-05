using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// если нужен HTTP без https при разработке через Aspire
// (или задайте переменную в AppHost — см. шаг 3)
app.Lifetime.ApplicationStarted.Register(() =>
    Console.WriteLine("GameServer started: " + app.Urls.FirstOrDefault())
);

// 1) Веб-сокеты
app.UseWebSockets();

// 2) Отдача SPA из wwwroot
app.UseDefaultFiles();   // ищет index.html по корню
app.UseStaticFiles();    // раздаёт /client.js, картинки и т.д.

app.MapGet("/health", () => "OK");
// 3) Endpoint для WebSocket
app.Map("/ws", async ctx =>
{
    if (!ctx.WebSockets.IsWebSocketRequest)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    using var ws = await ctx.WebSockets.AcceptWebSocketAsync();
    var buffer = new byte[4096];

    while (true)
    {
        var result = await ws.ReceiveAsync(buffer, ctx.RequestAborted);
        if (result.CloseStatus.HasValue)
            break;

        var json = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var type = root.GetProperty("type").GetString();

            if (type == "join")
            {
                Console.WriteLine($"JOIN: {root}");
            }
            else if (type == "commands")
            {
                Console.WriteLine($"COMMANDS: {root}");
            }
            else if (type == "ping")
            {
                Console.WriteLine($"PING: {root}");
                long tClient = doc.RootElement.TryGetProperty("clientTime", out var tEl) && tEl.TryGetInt64(out var tVal)
                               ? tVal : 0;
                var payload = new
                {
                    type = "pong",
                    clientTime = tClient,
                    serverTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                };

                var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload));
                await ws.SendAsync(bytes, WebSocketMessageType.Text, true, ctx.RequestAborted);
            }
            else
            {
                Console.WriteLine($"UNKNOWN: {root}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Bad JSON: " + ex.Message);
        }
    }

    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", ctx.RequestAborted);
});

// 4) Fallback для SPA-маршрутов (если позже добавите router)
app.MapFallbackToFile("/index.html");

app.Run();
