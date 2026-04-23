using Zeta.Samples.ServiceTitanFactoryApi;

// Minimal C# ASP.NET Core Web API serving the seed data for the
// ServiceTitan factory-demo. Companion to the F# sibling at
// samples/ServiceTitanFactoryApi — same 9 endpoints, same JSON
// shapes, same seed data. Any frontend consumes either one
// interchangeably.
//
// Why both F# and C# versions: the Zeta factory produces code in
// the target audience's stack. ServiceTitan uses C# with zero F#;
// the C# version minimises adoption friction while the F# version
// stays the factory's reference-language baseline.

// Static endpoint list — extracted to satisfy CA1861 (avoid re-allocating
// the array on every request to the root endpoint).
string[] endpoints =
[
    "/api/customers",
    "/api/opportunities",
    "/api/activities",
    "/api/pipeline/funnel",
    "/api/pipeline/duplicates",
];

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();
var app = builder.Build();

app.MapGet("/", () => new
{
    name = "ServiceTitan factory-demo API (C#)",
    version = "0.0.1",
    endpoints,
});

app.MapGet("/api/customers", () => Seed.Customers);
app.MapGet("/api/customers/{id:long}", (long id) =>
    Seed.Customers.FirstOrDefault(c => c.Id == id) is { } c
        ? Results.Ok(c)
        : Results.NotFound());

app.MapGet("/api/customers/{id:long}/activities", (long id) =>
    Seed.Activities.Where(a => a.CustomerId == id));

app.MapGet("/api/opportunities", () => Seed.Opportunities);
app.MapGet("/api/opportunities/{id:long}", (long id) =>
    Seed.Opportunities.FirstOrDefault(o => o.Id == id) is { } o
        ? Results.Ok(o)
        : Results.NotFound());

app.MapGet("/api/activities", () => Seed.Activities);

// MA0002 requires an explicit comparer for string GroupBy; ordinal is
// correct for our seed data — emails are already lowercased and ASCII.
app.MapGet("/api/pipeline/funnel", () =>
    Seed.Opportunities
        .GroupBy(o => o.Stage, StringComparer.Ordinal)
        .Select(g => new
        {
            Stage = g.Key,
            Count = g.Count(),
            TotalCents = g.Sum(o => o.AmountCents),
        }));

app.MapGet("/api/pipeline/duplicates", () =>
    Seed.Customers
        .GroupBy(c => c.Email, StringComparer.Ordinal)
        .Where(g => g.Count() > 1)
        .Select(g => new
        {
            Email = g.Key,
            CustomerIds = g.Select(c => c.Id).ToArray(),
        }));

app.Run();
