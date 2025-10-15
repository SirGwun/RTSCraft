namespace GameServer.Server.Game;

public sealed class Player
{
    public long Id { get; init; }

    public string Name { get; init; } = "";

    public string Color { get; init; } = "";

    // public int Gold { get; set; } = 0;
    // public int Wood { get; set; } = 0;
    // public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    // public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;
}
