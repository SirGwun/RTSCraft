// Program.cs
using GameServer.Server.Infra;       // WebSocketAcceptor
using GameServer.Server.Protocol;    // Json.Options, IMessageSerializer
using GameServer.Server.Domain;      // IdGen, PlayerRegistry
using GameServer.Server.Application; // SnapshotService
using Microsoft.AspNetCore.Http;

var builder = WebApplication.CreateBuilder(args);

// ---------- DI ----------
builder.Services.AddSingleton<IMessageSerializer, SystemTextJsonSerializer>();

builder.Services.AddSingleton<IdGen>();
builder.Services.AddSingleton<PlayerRegistry>();
builder.Services.AddSingleton<SnapshotService>();

builder.Services.AddSingleton<WebSocketAcceptor>();

var app = builder.Build();

// лог старта (как в старом Program.cs)
app.Lifetime.ApplicationStarted.Register(() =>
    Console.WriteLine("GameServer started: " + app.Urls.FirstOrDefault())
);

// ---------- Middleware ----------
app.UseWebSockets();       // WS как и раньше
app.UseDefaultFiles();     // SPA: искать index.html в wwwroot
app.UseStaticFiles();      // SPA: раздавать статику (js, css, assets)

// ---------- Endpoints ----------
app.MapGet("/health", () => "OK"); // старый health

// наш WS-эндпойнт → аккуратно отдаём в Acceptor
app.Map("/ws", (HttpContext ctx, WebSocketAcceptor acceptor) => acceptor.AcceptAsync(ctx));

// fallback для SPA-маршрутов (если фронт роутит сам)
app.MapFallbackToFile("/index.html");

// ---------- Run ----------
app.Run();
