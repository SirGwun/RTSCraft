using GameServer.Server.Game;

public sealed class Soldier : Unit
{
    public Soldier(string Id, Player owner, EntityType entityType, float x, float y, int w, int h, int hp, int attack, int speed) : base(Id, owner, entityType, x, y, w, h, hp, attack, speed)
    { }
}