FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["FinanceTechApi.csproj", "./"]
RUN dotnet restore "FinanceTechApi.csproj"
COPY . .
RUN dotnet publish "FinanceTechApi.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "FinanceTechApi.dll"]