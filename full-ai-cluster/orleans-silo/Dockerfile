# Zeta Orleans silo. Multi-stage: SDK builds, runtime ships.
#
# The build context is THIS directory only -- the repo root's Directory.Build.props
# is deliberately not in scope, and full-ai-cluster/orleans-silo/Directory.Build.props
# stops inheritance so the local build and the image build are the same build.
FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS build
WORKDIR /src

# Restore first so the layer caches on the project file alone.
COPY Directory.Build.props Directory.Packages.props Zeta.Orleans.Silo.csproj ./
RUN dotnet restore Zeta.Orleans.Silo.csproj

COPY . .
RUN dotnet publish Zeta.Orleans.Silo.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/runtime:10.0-noble AS runtime
WORKDIR /app
COPY --from=build /app .

# Non-root. The runtime image ships the `app` user (uid 1654).
USER app

#  11111 silo-to-silo   30000 client gateway   8080 dashboard
EXPOSE 11111 30000 8080

ENTRYPOINT ["dotnet", "Zeta.Orleans.Silo.dll"]
