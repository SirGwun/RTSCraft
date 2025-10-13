using GameServer.Game.Command;
using System.Text.Json.Serialization;

namespace GameServer.Server.Protocol;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(PingMsg), "ping")]
[JsonDerivedType(typeof(PongMsg), "pong")]
[JsonDerivedType(typeof(JoinMsg), "join")]
[JsonDerivedType(typeof(SnapshotMsg), "snapshot")]

[JsonDerivedType(typeof(MoveLineCommand), "MOVE_LINE")]
public record MsgBase;

public record PingMsg : MsgBase
{
    public long ClientTime { get; init; }
}

public record JoinMsg : MsgBase
{
    public string Name { get; init; } = "";
    public string Color { get; init; } = "";
}
public record PongMsg : MsgBase
{
    public long ServerTime { get; init; }
    public long ClientTime { get; init; }
}

public record SnapshotMsg : MsgBase
{
    public long lastAckSeq { get; init; } = 0; // Пока не используем, но клиент ждёт.
    public long ServerTime { get; init; }
    public long MyId { get; init; }
    public Dictionary<long, PlayerDto> Players { get; init; } = new();
    public Dictionary<long, EntityDto> Entities { get; init; } = new();
}

public record InitMsg : MsgBase
{
    public long MyId { get; init; }
    public long ServerTime { get; init; }
    public Dictionary<long, PlayerDto> Players { get; init; } = new();
}

public readonly record struct Vec2(
    [property: JsonPropertyName("x")] double X,
    [property: JsonPropertyName("y")] double Y
);

public abstract record CommandBase : MsgBase;

public sealed record MoveLineCommand : CommandBase
{  
    public string Id { get; init; } = default!;
    public Vec2 Target { get; init; }
    public string ClientId { get; init; } = default!;
    public int Seq { get; init; }
}


public record PlayerDto(long Id, string Name, string Color, int Gold, int Wood);


public record EntityDto(
    long Id, string Type, double X, double Y, double W, double H,
    int Hp, long Owner, double Speed, string Color, bool Selectable
);