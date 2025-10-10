using GameServer.Game.Command;

namespace GameServer.Server.Protocol;

/// <summary>
/// Ѕазовый конверт дл€ всех сообщений: содержит только тип.
/// —начала парсим в MsgBase, читаем Type, потом Ч во второй проход в конкретный DTO.
/// </summary>
public record MsgBase
{
    public string? Type { get; init; }
}

// ѕримеры конкретных сообщений:
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
    public string Type { get; init; } = "pong";
    public long ServerTime { get; init; }
    public long ClientTime { get; init; }
}
// ... MsgBase, PingMsg, PongMsg, JoinMsg Ч уже есть ...

/// <summary>ѕервичный снапшот состо€ни€, который клиент ждЄт сразу после join.</summary>
public record SnapshotMsg : MsgBase
{
    public string Type { get; init; } = "snapshot";
    public long Time { get; init; }
    public long MyId { get; init; }
    public Dictionary<long, PlayerDto> Players { get; init; } = new();
    public Dictionary<long, EntityDto> Entities { get; init; } = new();
}

public record CommandMsg : MsgBase
{
    public string Type { get; init; } = "cmd";

    public ICommand Command { get; init; } 


    public CommandMsg(ICommand command) => Command = command;
}

public record PlayerDto(long Id, string Name, string Color, int Gold, int Wood);

// ѕока сущностей нет Ч держим DTO на будущее, клиенту формат уже привычен.
public record EntityDto(
    long Id, string Type, double X, double Y, double W, double H,
    int Hp, long Owner, double Speed, string Color, bool Selectable
);