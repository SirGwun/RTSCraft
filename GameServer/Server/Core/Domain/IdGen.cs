namespace GameServer.Server.Core.Domain;

public sealed class IdGen
{
    private long _playerId = 0;

    private long _entityeId = 0;

    public long? NextEntitye() => Interlocked.Increment(ref _entityeId);

    public long NextPlayer() => Interlocked.Increment(ref _playerId);
}
