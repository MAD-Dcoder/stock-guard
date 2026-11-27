FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY StockGuard.slnx ./
COPY src/StockGuard.Domain/StockGuard.Domain.csproj src/StockGuard.Domain/
COPY src/StockGuard.Application/StockGuard.Application.csproj src/StockGuard.Application/
COPY src/StockGuard.Infrastructure/StockGuard.Infrastructure.csproj src/StockGuard.Infrastructure/
COPY src/StockGuard.Api/StockGuard.Api.csproj src/StockGuard.Api/

RUN dotnet restore src/StockGuard.Api/StockGuard.Api.csproj

COPY src/ src/
RUN dotnet publish src/StockGuard.Api/StockGuard.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "StockGuard.Api.dll"]
