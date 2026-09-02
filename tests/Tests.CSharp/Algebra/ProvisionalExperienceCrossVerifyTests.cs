using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Xunit;

namespace Zeta.Tests.CSharp.Algebra;

public class ProvisionalExperienceCrossVerifyTests
{
    private sealed class ProvisionalUli
    {
        public string LanguageCode { get; set; } = "";
        public string LexiconHash { get; set; } = "";
    }

    private sealed class ProvisionalUii
    {
        public string AgentId { get; set; } = "";
        public string[] Capabilities { get; set; } = Array.Empty<string>();
    }

    private sealed class ProvisionalUti
    {
        public double Temperature { get; set; }
        public double DecayRate { get; set; }
    }

    private sealed class ProvisionalUtri
    {
        public string RootHash { get; set; } = "";
    }

    private sealed class ProvisionalExperienceState
    {
        public ProvisionalUli Uli { get; set; } = new();
        public ProvisionalUii Uii { get; set; } = new();
        public ProvisionalUti Uti { get; set; } = new();
        public ProvisionalUtri Utri { get; set; } = new();
        public string RootHash { get; set; } = "";
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private static string RepoRoot()
    {
        var dir = new DirectoryInfo(Path.GetDirectoryName(typeof(ProvisionalExperienceCrossVerifyTests).Assembly.Location)!);
        while (dir is not null && !File.Exists(Path.Join(dir.FullName, "Zeta.sln")))
        {
            dir = dir.Parent;
        }
        return dir?.FullName ?? throw new InvalidOperationException("Could not locate repo root.");
    }

    private static string Sha256Bytes(byte[] bytes)
    {
        var hash = SHA256.HashData(bytes);
        return string.Concat(hash.Select(b => b.ToString("x2", CultureInfo.InvariantCulture)));
    }

    private static string HashSymlink(string path)
    {
        var info = new FileInfo(path);
        var target = info.LinkTarget ?? "";
        var normalized = target.Replace("\\", "/", StringComparison.Ordinal);
        return Sha256Bytes(Encoding.UTF8.GetBytes("symlink\n" + normalized));
    }

    private static string HashFile(string path)
    {
        var content = File.ReadAllBytes(path);
        var prefix = Encoding.UTF8.GetBytes("file\n");
        var buffer = new byte[prefix.Length + content.Length];
        Buffer.BlockCopy(prefix, 0, buffer, 0, prefix.Length);
        Buffer.BlockCopy(content, 0, buffer, prefix.Length, content.Length);
        return Sha256Bytes(buffer);
    }

    private sealed class ChildEntry
    {
        public string Type { get; set; } = "";
        public string Hash { get; set; } = "";
        public string Name { get; set; } = "";
    }

    private static string HashDirectory(string path)
    {
        var di = new DirectoryInfo(path);
        var children = di.GetFileSystemInfos();
        var entries = new List<ChildEntry>();

        foreach (var info in children)
        {
            var isLink = info.Attributes.HasFlag(FileAttributes.ReparsePoint);
            if (isLink)
            {
                entries.Add(new ChildEntry { Type = "symlink", Hash = HashSymlink(info.FullName), Name = info.Name });
            }
            else if (info.Attributes.HasFlag(FileAttributes.Directory))
            {
                entries.Add(new ChildEntry { Type = "dir", Hash = HashDirectory(info.FullName), Name = info.Name });
            }
            else
            {
                entries.Add(new ChildEntry { Type = "file", Hash = HashFile(info.FullName), Name = info.Name });
            }
        }

        var sorted = entries.OrderBy(e => e.Name, StringComparer.Ordinal).ToList();
        var sb = new StringBuilder();
        sb.Append("directory\n");
        foreach (var entry in sorted)
        {
            sb.Append(entry.Type)
              .Append(' ')
              .Append(entry.Hash)
              .Append(' ')
              .Append(entry.Name)
              .Append('\n');
        }

        return Sha256Bytes(Encoding.UTF8.GetBytes(sb.ToString()));
    }

    /// <summary>
    /// The fixture tree contains two git symlinks (mode 120000). Git checks a symlink out as a REAL
    /// symlink only when <c>core.symlinks</c> is true — on Windows that needs Developer Mode or an
    /// elevated clone, and git sets it to <c>false</c> otherwise. With it false the entries arrive as
    /// ORDINARY FILES whose content is the target path ("../file1.txt", ".."), so
    /// <see cref="HashDirectory"/> classifies them <c>file</c> instead of <c>symlink</c> and hashes a
    /// different tree.
    ///
    /// That must not read as a byte-lock failure. The golden vector is the four-oracle treaty and it
    /// is not wrong; the CHECKOUT cannot represent the input the treaty is stated over. Measured on
    /// Windows 2026-09-02: expected 081478c5…, got ec742172… — a mismatch with no defect behind it.
    ///
    /// So this is detected and named rather than asserted through. Not silently: the test SKIPS with
    /// the reason, which xunit reports as skipped-with-cause, never as a pass.
    /// </summary>
    private static bool SymlinksAreRealInThisCheckout(string fixtureDir)
    {
        var link = new FileInfo(Path.Join(fixtureDir, "subdir1", "link_to_file1"));
        return link.Exists && link.Attributes.HasFlag(FileAttributes.ReparsePoint);
    }

    [Fact]
    public void ProvisionalExperienceReplayMatchesGoldenVectors()
    {
        var root = RepoRoot();
        var fixtureDir = Path.Join(root, "tests", "cross-verification", "experience", "fixtures", "tree1");

        if (!SymlinksAreRealInThisCheckout(fixtureDir))
        {
            Assert.Skip(
                "fixture symlinks were checked out as plain files (git core.symlinks=false) — the tree "
                + "this golden vector is stated over cannot be represented in this checkout. Enable "
                + "Developer Mode / `git config core.symlinks true` and re-clone to run it.");
        }

        var rootHash = HashDirectory(fixtureDir);

        var caps = new[] { "speak", "traverse" };
        Array.Sort(caps, StringComparer.Ordinal);

        var state = new ProvisionalExperienceState
        {
            Uli = new ProvisionalUli { LanguageCode = "en-US", LexiconHash = "a8f5c2b3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1" },
            Uii = new ProvisionalUii { AgentId = "agent-007", Capabilities = caps },
            Uti = new ProvisionalUti { Temperature = 0.7, DecayRate = 0.1 },
            Utri = new ProvisionalUtri { RootHash = rootHash },
            RootHash = rootHash
        };

        var results = new Dictionary<string, ProvisionalExperienceState>(StringComparer.Ordinal)
        {
            { "provisional-experience-v1", state }
        };

        var json = JsonSerializer.Serialize(results, JsonOptions);
        var outputPath = Path.Join(root, "tests", "cross-verification", "experience", "cs-output.json");
        File.WriteAllText(outputPath, json + "\n");

        Assert.Equal("081478c5744a061d3eb3e9800a78517b8f6dc060759a2ce2a0a32b516c80fdc9", rootHash);
    }
}
