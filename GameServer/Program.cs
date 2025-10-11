using GameServer.Server.Protocol;
using GameServer.Server.Domain;
using Microsoft.AspNetCore.Http;
using GameServer.Server;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<SystemTextJsonSerializer>();

builder.Services.AddSingleton<IdGen>();
builder.Services.AddSingleton<PlayerRegistry>();
builder.Services.AddSingleton<Sendler>();
builder.Services.AddSingleton<WebSocketAcceptor>();

var app = builder.Build();

app.Lifetime.ApplicationStarted.Register(() =>
    Console.WriteLine("GameServer started: " + app.Urls.FirstOrDefault())
);

app.UseWebSockets();       
app.UseDefaultFiles();     
app.UseStaticFiles();      


app.Map("/ws", (HttpContext ctx, WebSocketAcceptor acceptor) => acceptor.AcceptAsync(ctx));

app.MapFallbackToFile("/index.html");

app.Run();
