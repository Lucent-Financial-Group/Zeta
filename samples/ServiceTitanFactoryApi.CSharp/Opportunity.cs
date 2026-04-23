namespace Zeta.Samples.ServiceTitanFactoryApi;

public record Opportunity(
    long Id,
    long CustomerId,
    string Stage,
    long AmountCents,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
