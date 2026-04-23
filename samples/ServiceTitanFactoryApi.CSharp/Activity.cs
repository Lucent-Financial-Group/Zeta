namespace Zeta.Samples.ServiceTitanFactoryApi;

public record Activity(
    long Id,
    long CustomerId,
    long? OpportunityId,
    string Kind,
    string Notes,
    DateTimeOffset OccurredAt);
