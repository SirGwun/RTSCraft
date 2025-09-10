using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

var game = builder.AddProject<Projects.GameServer>("gameserver")
                  .WithExternalHttpEndpoints();

builder.Build().Run();