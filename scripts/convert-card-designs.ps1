# Converts the printed-card design PDFs (page 1 = front, page 2 = back) to
# PNGs under public/cards, using the PDF renderer built into Windows, so no
# third-party dependency is needed. One PDF per person; the file name becomes
# the card slug.
#
#   powershell -NoProfile -ExecutionPolicy Bypass `
#     -File scripts\convert-card-designs.ps1 -Source "D:\Design\Angela\Energy4Impact"

param(
  [Parameter(Mandatory = $true)][string]$Source,
  [string]$OutDir
)

if (-not $OutDir) {
  $OutDir = Join-Path $PSScriptRoot "..\public\cards"
}

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime]

# WinRT async operations complete on the thread pool, so bridge them onto
# .NET tasks and block; Windows PowerShell has no await.
$asTaskMethods = [System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object { $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 }
$asTaskOp = $asTaskMethods |
  Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } |
  Select-Object -First 1
$asTaskAction = $asTaskMethods |
  Where-Object { $_.GetParameters()[0].ParameterType.Name -eq "IAsyncAction" } |
  Select-Object -First 1

function AwaitOp($operation, $resultType) {
  $task = $asTaskOp.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $task.Wait() | Out-Null
  $task.Result
}

function AwaitAction($action) {
  $task = $asTaskAction.Invoke($null, @($action))
  $task.Wait() | Out-Null
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$resolvedOut = (Resolve-Path $OutDir).Path

Get-ChildItem -LiteralPath $Source -Filter *.pdf | ForEach-Object {
  $slug = ($_.BaseName.ToLower() -replace "[^a-z0-9]+", "-").Trim("-")
  Write-Host "$($_.Name) -> $slug"

  $file = AwaitOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync($_.FullName)) ([Windows.Storage.StorageFile])
  $pdf = AwaitOp ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
  $folder = AwaitOp ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($resolvedOut)) ([Windows.Storage.StorageFolder])

  for ($i = 0; $i -lt [int]$pdf.PageCount; $i++) {
    $side = if ($i -eq 0) { "front" } else { "back" }
    $name = "$slug-$side.png"

    $dest = AwaitOp ($folder.CreateFileAsync($name, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
    $stream = AwaitOp ($dest.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)) ([Windows.Storage.Streams.IRandomAccessStream])
    $options = New-Object Windows.Data.Pdf.PdfPageRenderOptions
    $options.DestinationWidth = [uint32]1600
    AwaitAction ($pdf.GetPage($i).RenderToStreamAsync($stream, $options))
    $stream.Dispose()
    Write-Host "  $name"
  }
}
