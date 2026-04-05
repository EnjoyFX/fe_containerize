{{- define "app.namespace" -}}
{{ .Values.namespace | default "fe-containerize" }}
{{- end -}}

{{- define "app.labels" -}}
app.kubernetes.io/managed-by: helm
app.kubernetes.io/part-of: fe-containerize
{{- end -}}
