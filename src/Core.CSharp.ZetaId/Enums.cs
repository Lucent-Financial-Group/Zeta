namespace Zeta.Core.CSharp.ZetaId;

/// <summary>
/// Controlled vocabularies (will be Roslyn-generated from registry/*.yaml in Phase 1.5.C)
/// </summary>
public enum Chromosome
{
    MetaCoherence = 0,
    FinancialIntegrity = 7
    // ... full set from registry/chromosomes.yaml
}

public enum Category
{
    Observation = 0,
    Emission = 1,
    Workflow = 2,
    Heartbeat = 3
}

public enum Firefly
{
    NoDirective = 1
    // ... full set
}

public enum Persona
{
    Aaron = 1,
    FireflyCoherence = 2
    // ... full set from registry/personas.yaml
}

public enum Location
{
    EastUS_VA1 = 1
    // ... full set from registry/locations.yaml
}
