using System.Runtime.InteropServices;
using System.Text.Json.Serialization;

namespace GameServer.Server.Web.Protocol;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(PingMsg), "ping")]
[JsonDerivedType(typeof(PongMsg), "pong")]
[JsonDerivedType(typeof(JoinMsg), "join")]
[JsonDerivedType(typeof(InitMsg), "init")]
[JsonDerivedType(typeof(SnapshotMsg), "snapshot")]

[JsonDerivedType(typeof(MoveLineCommand), "MOVE_LINE")]
[JsonDerivedType(typeof(MoveCommand), "MOVE")]

[JsonDerivedType(typeof(AttackCommand), "ATTACK")]

[JsonDerivedType(typeof(StopCommand), "STOP")]

[JsonDerivedType(typeof(KillUnitCommand), "KILL_UNIT")]
[JsonDerivedType(typeof(SpawnUnitCommand), "SPAWN_UNIT")]

[JsonDerivedType(typeof(HarvestCommand), "HARVEST")]
[JsonDerivedType(typeof(BuildCommand), "BUILD")]
public record MsgBase;
public record CommandBase : MsgBase
{
    public int Seq { get; set; }

    public string ClientId { get; set; } = "";
}

public record PingMsg(long ClientTime) : MsgBase;
public record JoinMsg(string Name, string Collor) : MsgBase;
public record PongMsg(long ServerTime, long ClientTime) : MsgBase;
public record SnapshotMsg(long lastAckSeq, long ServerTime, long MyId, Dictionary<long, PlayerDto> Players, Dictionary<long, EntityDto> Entities) : MsgBase;
public record InitMsg(long MyId, long ServerTime, Dictionary<long, PlayerDto> Players) : MsgBase;

public record PlayerDto(long Id, string Name, string Color, int Gold, int Wood);
public record EntityDto(
    long Id, EntityType Type, float X, float Y, float W, float H,
    int Hp, string Owner, float Speed, string Color, bool Selectable
);


/*
 * clientside commands: 
 *          move: (ids, target, mode) => makeCommand(clientsideCommand, 'MOVE', ids, { target, mode }),
            moveLine: (ids, target, mode) => makeCommand(clientsideCommand, 'MOVE_LINE', ids, { target, mode }),
            stop: (ids) => makeCommand(clientsideCommand, 'STOP', ids),
            attack: (ids, target) => makeCommand(clientsideCommand, 'ATTACK', ids, { target }),
            sinc: (newUnitSt, oldUnitSt, sincSteps) => toTick.push({ type: 'SINC', newUnitSt, oldUnitSt, sincSteps }),

            // SERVERSIDE
            spawnUnit: (props) => serversideCommand({ type: 'SPAWN_UNIT', props }),
            killUnit: (unit) => serversideCommand({ type: 'KILL_UNIT', unit }),
            dealDamage: (target) => serversideCommand({ type: 'DEAL_DAMAGE', target }),
 */