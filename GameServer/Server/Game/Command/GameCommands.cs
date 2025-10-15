using GameServer.Server.Web.Protocol;
using System.Text.Json.Serialization;

public enum MoveMod 
{ 
    DEFAULT,
    LINE,
    ATTACK
}

public readonly record struct Vec2(
    [property: JsonPropertyName("x")] double X,
    [property: JsonPropertyName("y")] double Y
);

//deplecated
public record MoveLineCommand(string id, Vec2 Target) : CommandBase;
public record MoveCommand(string id, Vec2 Target, MoveMod mod) : CommandBase;
public record StopCommand(string id) : CommandBase;
public record AttackCommand(string id, string target) : CommandBase;
public record HarvestCommand(string id, string resourceId) : CommandBase;
public record BuildCommand(string id, Vec2 target, string buildingType) : CommandBase;


public record SpawnUnitCommand(string id, Vec2 Position) : CommandBase;
public record KillUnitCommand(string id) : CommandBase;
public record DealDamageCommand(string targetId, int damage) : CommandBase;