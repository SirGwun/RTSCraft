using System.Net.WebSockets;
using Microsoft.AspNetCore.Http;
using GameServer.Server.Protocol;
using GameServer.Server.Domain;

namespace GameServer.Server;

public sealed class WebSocketAcceptor
{
    private readonly SystemTextJsonSerializer _serializer;
    private readonly IdGen _ids;
    private readonly PlayerRegistry _players;
    private readonly SnapshotService _snapshots;

    public WebSocketAcceptor(
        SystemTextJsonSerializer serializer,
        IdGen ids,
        PlayerRegistry players,
        SnapshotService snapshots)
    {
        _serializer = serializer;
        _ids = ids;
        _players = players;
        _snapshots = snapshots;
    }

    public async Task AcceptAsync(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest) { context.Response.StatusCode = 400; return; }
        using var socket = await context.WebSockets.AcceptWebSocketAsync();

        var session = new WebSocketSession(socket, _serializer, _ids, _players, _snapshots);
        await session.RunAsync(context.RequestAborted);
    }
}
