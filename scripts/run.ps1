<#
    Script description.

    Some notes.
#>
param (
    # height of largest column without top bar
    [Parameter(Mandatory=$true)]
    [string]$uri,
    
    [int]$id_mercado
)

npm start "$uri" $id_mercado