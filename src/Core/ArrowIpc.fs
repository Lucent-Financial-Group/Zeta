namespace Zeta.Core

open System
open System.Buffers
open System.Buffers.Binary
open System.IO
open Apache.Arrow
open Apache.Arrow.Compression
open Apache.Arrow.Ipc


/// Shared Arrow IPC stream codec — zstd buffer compression (ROADMAP P1).
/// Writer sets `IpcOptions.CompressionCodec = Zstd`. Reader always gets
/// `CompressionCodecFactory` so **uncompressed legacy frames still decode**.
///
/// The codec factory lives in the official `Apache.Arrow.Compression`
/// package (same 23.0.0 pin as `Apache.Arrow`).
module ArrowIpc =

    let codecFactory : ICompressionCodecFactory =
        CompressionCodecFactory() :> ICompressionCodecFactory

    let zstdOptions =
        let o = IpcOptions()
        o.CompressionCodec <- Nullable CompressionCodecType.Zstd
        o.CompressionCodecFactory <- codecFactory
        o

    let uncompressedOptions = IpcOptions()

    let writePayload (schema: Schema) (batch: RecordBatch) (options: IpcOptions) : byte array =
        use ms = new MemoryStream()
        use arrowWriter = new ArrowStreamWriter(ms, schema, leaveOpen = true, options = options)
        arrowWriter.WriteRecordBatch batch
        arrowWriter.WriteEnd()
        ms.ToArray()

    let frame (payload: byte array) : byte array =
        let framed = Array.zeroCreate<byte> (4 + payload.Length)
        BinaryPrimitives.WriteInt32LittleEndian(Span<byte>(framed, 0, 4), payload.Length)
        if payload.Length > 0 then
            Array.Copy(payload, 0, framed, 4, payload.Length)
        framed

    let writeFramed (schema: Schema) (batch: RecordBatch) (writer: IBufferWriter<byte>) : unit =
        let payload = writePayload schema batch zstdOptions
        let lenHdr = writer.GetSpan 4
        BinaryPrimitives.WriteInt32LittleEndian(lenHdr, payload.Length)
        writer.Advance 4
        if payload.Length > 0 then
            let dst = writer.GetSpan payload.Length
            payload.AsSpan().CopyTo dst
            writer.Advance payload.Length

    let writeFramedBytes (schema: Schema) (batch: RecordBatch) : byte array =
        frame (writePayload schema batch zstdOptions)

    /// Uncompressed sibling — test / size-comparison only.
    let writeFramedUncompressed (schema: Schema) (batch: RecordBatch) : byte array =
        frame (writePayload schema batch uncompressedOptions)

    let openReader (payload: byte array) : ArrowStreamReader =
        new ArrowStreamReader(ReadOnlyMemory<byte> payload, codecFactory)
