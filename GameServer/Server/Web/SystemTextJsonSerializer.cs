using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace GameServer.Server.Web;
using GameServer.Server.Web.Protocol;

public sealed class SystemTextJsonSerializer
{
    public MsgBase? Deserialize(string json)
    {   
        try
        {
            var msg = JsonSerializer.Deserialize<MsgBase>(json, Json.Options);
            return msg;
        }
        catch (JsonException e)
        {
            Console.WriteLine("[Exception!!!] " + "Can't handle input! " + json);
            Console.WriteLine("[Exception!!!] " + e);
            return new MsgBase();
        }
    }

    public async Task<MsgBase?> ReceiveAsync(WebSocket socket, byte[] buffer, CancellationToken ct)
    {
        using var ms = new MemoryStream();

        while (!ct.IsCancellationRequested && socket.State == WebSocketState.Open)
        {
            WebSocketReceiveResult result = await socket.ReceiveAsync(buffer, ct);

            if (result.MessageType == WebSocketMessageType.Close)
                return null;

            if (result.MessageType != WebSocketMessageType.Text)
            {
                if (!result.EndOfMessage)
                {
                    do { result = await socket.ReceiveAsync(buffer, ct); }
                    while (!result.EndOfMessage && socket.State == WebSocketState.Open);
                }
                return null;
            }

            ms.Write(buffer, 0, result.Count);

            if (result.EndOfMessage)
            {
                string json = Encoding.UTF8.GetString(ms.GetBuffer(), 0, (int)ms.Length);
                return Deserialize(json);
            }
        }

        return null;
    }

    public Task SendAsync(WebSocket socket, MsgBase payload, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(payload, Json.Options);
        var bytes = Encoding.UTF8.GetBytes(json);
        return socket.SendAsync(bytes, WebSocketMessageType.Text, true, ct);
    }
}
