#!/usr/bin/env python3
"""Validate complete P10.1 CSV exports locally. No database connection or writes."""
import csv,hashlib,json,sys
from collections import Counter,defaultdict
from pathlib import Path
def md5(text):return hashlib.md5(text.encode('utf-8')).hexdigest()
def validate_rows(rows):
 fields={'section','object_identity','chunk_index','chunk_count','record_bytes','record_md5','payload'}
 groups=defaultdict(list)
 for row in rows:
  if not fields.issubset(row):raise ValueError('Missing CSV columns')
  groups[(row['section'],row['object_identity'])].append(row)
 if not groups:raise ValueError('Empty export')
 records={};texts={}
 for key,chunks in groups.items():
  counts={int(c['chunk_count']) for c in chunks};sizes={int(c['record_bytes']) for c in chunks};hashes={c['record_md5'] for c in chunks}
  if len(counts)!=1 or len(sizes)!=1 or len(hashes)!=1:raise ValueError('Conflicting chunk metadata')
  count=next(iter(counts));chunks=sorted(chunks,key=lambda c:int(c['chunk_index']))
  if count<1 or [int(c['chunk_index']) for c in chunks]!=list(range(1,count+1)):raise ValueError('Missing or duplicate chunks')
  text=''.join(c['payload'] for c in chunks)
  if len(text.encode('utf-8'))!=next(iter(sizes)) or md5(text)!=next(iter(hashes)):raise ValueError('Record checksum mismatch')
  texts[key]=text;records[key]=json.loads(text)
 manifests=[key for key in records if key[0]=='99_manifest']
 if len(manifests)!=1:raise ValueError('Expected exactly one manifest')
 manifest_key=manifests[0];phase=manifest_key[1]
 if phase not in ['P10.1_SECURITY','P10.1_PERFORMANCE']:raise ValueError('Unexpected phase')
 summary=records.get(('00_summary',phase));manifest=records[manifest_key]
 if not summary or summary.get('phase')!=phase+'_READ_ONLY' or manifest.get('phase')!=phase+'_MANIFEST':raise ValueError('Missing or invalid summary/manifest')
 body={k:v for k,v in texts.items() if k!=manifest_key}
 if len(body)!=manifest['record_count']:raise ValueError('Record count mismatch')
 if dict(Counter(k[0] for k in body))!=manifest['section_counts']:raise ValueError('Section count mismatch')
 if sum(len(v.encode('utf-8')) for v in body.values())!=manifest['total_payload_bytes']:raise ValueError('Export byte count mismatch')
 if md5('\\n'.join('|'.join([k[0],k[1],md5(body[k])]) for k in sorted(body)))!=manifest['records_md5']:raise ValueError('Manifest checksum mismatch')
 if summary.get('read_only') is not True or summary.get('database_changed') is not False:raise ValueError('Unexpected read-only contract')
 return {'export_integrity_pass':True,'phase':phase,'csv_row_count':len(rows),'record_count':len(body),
  'review_status':'REQUIRES_REVIEW','p10_accepted':False,'summary':summary},records
def main():
 if len(sys.argv)!=2:raise ValueError('Usage: verify-evidence.py export.csv')
 csv.field_size_limit(10_000_000)
 with Path(sys.argv[1]).open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
 result,_=validate_rows(rows);print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':
 try:main()
 except (ValueError,KeyError,TypeError,OSError) as e:
  print(json.dumps({'export_integrity_pass':False,'error':str(e)},ensure_ascii=False),file=sys.stderr);sys.exit(1)
