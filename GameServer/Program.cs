using Microsoft.AspNetCore.Http;
using GameServer.Server.Web;
using GameServer.Server.Core.Domain;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<SystemTextJsonSerializer>();

builder.Services.AddSingleton<IdGen>();
builder.Services.AddSingleton<PlayerRegistry>();
builder.Services.AddSingleton<Sendler>();
builder.Services.AddSingleton<WebSocketAcceptor>();

var app = builder.Build();

Console.WriteLine($"Environment: {app.Environment.EnvironmentName}");

if (app.Environment.IsDevelopment())
{
    app.UseStaticFiles(new StaticFileOptions
    {
        OnPrepareResponse = ctx =>
        {
            var h = ctx.Context.Response.GetTypedHeaders();
            h.CacheControl = new Microsoft.Net.Http.Headers.CacheControlHeaderValue
            {
                NoStore = true,       
                NoCache = true,       
                MustRevalidate = true
            };
            h.Expires = DateTimeOffset.UtcNow;
        }
    });
}
else
{
    app.UseStaticFiles();
}

app.Lifetime.ApplicationStarted.Register(() =>
    Console.WriteLine("GameServer started: " + app.Urls.FirstOrDefault())
);

app.UseWebSockets();       
app.UseDefaultFiles();        


app.Map("/ws", (HttpContext ctx, WebSocketAcceptor acceptor) => acceptor.AcceptAsync(ctx));

app.MapFallbackToFile("/index.html");

app.Run();
