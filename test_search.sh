#!/bin/bash

curl -X POST \
  'http://localhost:8000/api/v1/knowledge/search' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGFya2V0aWMuY29tIiwidXNlcl9pZCI6ImYyZGE5YTE4LTcyODEtNDlkZS05NTZkLTYzNDczYzI0YjRkZiIsImVtYWlsIjoidGVzdEBhcmtldGljLmNvbSIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJyb2xlcyI6WyJhZG1pbiJdLCJwZXJtaXNzaW9ucyI6WyJyZWFkIiwid3JpdGUiLCJhZG1pbiIsInVzZXJzOm1hbmFnZSIsInJvbGVzOm1hbmFnZSIsInN5c3RlbTpjb25maWd1cmUiLCJyZXBvcnRzOnZpZXciLCJhbmFseXRpY3M6dmlldyJdLCJleHAiOjE3NTQ4MjAxODJ9.QknK3LbMzG3u5Zg_4Rb-mJVXo2x9nEG7QIpPkQniVSY' \
  -H 'Content-Type: application/json' \
  -d '{
  "query": "ali",
  "document_id": "3d2f647c-f474-4a64-8bce-22e470a72967",
  "k": 5,
  "score_threshold": 0.7,
  "search_type": "semantic",
  "filters": {}
}'