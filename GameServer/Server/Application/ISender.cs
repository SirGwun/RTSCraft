namespace GameServer.Server.Application;

public interface ISender
{
    Task SendAsync(object payload, CancellationToken ct);
}
