import { useEffect, useMemo, useState } from 'react';
import { useEditorStore, useUIStore } from '@/store';
import { Button, Input, Label, Modal, Stack } from '@/components/ui';

const STORAGE_KEY = 'etherx-mailing-recipients';

const DEFAULT_RECIPIENTS = [
  { FirstName: 'Ava', LastName: 'Carter', Address: '12 River Road', City: 'Seattle', State: 'WA', Zip: '98101', Email: 'ava@example.com' },
  { FirstName: 'Noah', LastName: 'Patel', Address: '88 Market Street', City: 'Austin', State: 'TX', Zip: '78701', Email: 'noah@example.com' },
];

const mergeTokenRegex = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function loadRecipients() {
  const storage = getStorage();
  if (!storage) return DEFAULT_RECIPIENTS;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RECIPIENTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_RECIPIENTS;
  } catch {
    return DEFAULT_RECIPIENTS;
  }
}

function saveRecipients(recipients) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(recipients));
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvToRecipients(csv) {
  const rows = String(csv || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!rows.length) return [];

  const headers = parseCsvLine(rows[0]);
  return rows.slice(1).map((row) => {
    const values = parseCsvLine(row);
    return headers.reduce((recipient, header, index) => {
      recipient[header || `Field${index + 1}`] = (values[index] || '').trim();
      return recipient;
    }, {});
  }).filter((recipient) => Object.values(recipient).some(Boolean));
}

function recipientsToCsv(recipients) {
  if (!recipients.length) return 'FirstName,LastName,Address,City,State,Zip,Email\n';
  const headers = Object.keys(recipients[0]);
  const lines = [headers.join(',')];
  recipients.forEach((recipient) => {
    lines.push(headers.map((header) => escapeCsvValue(recipient[header])).join(','));
  });
  return lines.join('\n');
}

function insertHtml(editor, html) {
  if (!editor) return false;
  editor.chain().focus().insertContent(html).run();
  editor.view?.focus();
  return true;
}

function mergeDocumentHtml(html, recipient) {
  return String(html || '').replace(mergeTokenRegex, (_, key) => String(recipient?.[key] ?? `{{${key}}}`));
}

function extractFields(recipients) {
  const fields = new Set();
  recipients.forEach((recipient) => Object.keys(recipient || {}).forEach((key) => fields.add(key)));
  return [...fields];
}

export function MailMergeDialog() {
  const { closeDialog, openDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [recipients, setRecipients] = useState(() => loadRecipients());
  const [csv, setCsv] = useState(() => recipientsToCsv(loadRecipients()));

  const fieldCount = useMemo(() => extractFields(recipients).length, [recipients]);

  const persist = (nextRecipients) => {
    setRecipients(nextRecipients);
    saveRecipients(nextRecipients);
    setCsv(recipientsToCsv(nextRecipients));
  };

  const loadSample = () => persist(DEFAULT_RECIPIENTS);

  const saveCsv = () => {
    const parsed = csvToRecipients(csv);
    if (!parsed.length) {
      toast('Add at least one recipient row', 'info');
      return false;
    }
    persist(parsed);
    toast('Recipients saved', 'success');
    return true;
  };

  const saveCsvAndOpenRecipients = () => {
    if (!saveCsv()) return;
    openDialog('selectRecipients');
  };

  return (
    <Modal title="Mail Merge" onClose={() => closeDialog('mailMerge')} width={720}>
      <Stack gap={14}>
        <div>
          <Label>Recipients CSV</Label>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={11}
            placeholder="FirstName,LastName,Address,City,State,Zip,Email"
            style={{ width: '100%', resize: 'vertical', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-ui)' }}
          />
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
            {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} loaded, {fieldCount} fields detected.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={loadSample}>Load Sample</Button>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button variant="subtle" onClick={() => closeDialog('mailMerge')}>Close</Button>
            <Button variant="outline" onClick={saveCsvAndOpenRecipients}>Select Recipients</Button>
            <Button variant="primary" onClick={saveCsv}>Save Recipients</Button>
          </div>
        </div>

        <div>
          <Label>Preview</Label>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', background: 'var(--bg-elevated)', maxHeight: 180, overflow: 'auto' }}>
            {recipients.map((recipient, index) => (
              <div key={`${recipient.Email || index}`} style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
                {recipient.FirstName || recipient.firstName || 'Recipient'} {recipient.LastName || recipient.lastName || ''} • {recipient.Email || recipient.email || 'no email'}
              </div>
            ))}
          </div>
        </div>
      </Stack>
    </Modal>
  );
}

export function SelectRecipientsDialog() {
  const { closeDialog, toast } = useUIStore();
  const [recipients, setRecipients] = useState(() => loadRecipients());
  const [csv, setCsv] = useState(() => recipientsToCsv(loadRecipients()));

  const save = () => {
    const parsed = csvToRecipients(csv);
    if (!parsed.length) {
      toast('Add at least one recipient row', 'info');
      return;
    }
    setRecipients(parsed);
    saveRecipients(parsed);
    toast('Recipients selected', 'success');
  };

  return (
    <Modal title="Select Recipients" onClose={() => closeDialog('selectRecipients')} width={680}>
      <Stack gap={14}>
        <div>
          <Label>CSV Input</Label>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={11}
            style={{ width: '100%', resize: 'vertical', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-ui)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={() => { setCsv(recipientsToCsv(DEFAULT_RECIPIENTS)); setRecipients(DEFAULT_RECIPIENTS); }}>Use Sample</Button>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button variant="subtle" onClick={() => closeDialog('selectRecipients')}>Cancel</Button>
            <Button variant="primary" onClick={save}>Save Selection</Button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
          {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} currently available.
        </div>
      </Stack>
    </Modal>
  );
}

export function EditRecipientsDialog() {
  const { closeDialog, toast } = useUIStore();
  const [recipients, setRecipients] = useState(() => loadRecipients());

  const updateField = (rowIndex, field, value) => {
    setRecipients((current) => current.map((recipient, index) => (index === rowIndex ? { ...recipient, [field]: value } : recipient)));
  };

  const addRecipient = () => setRecipients((current) => [...current, { FirstName: '', LastName: '', Address: '', City: '', State: '', Zip: '', Email: '' }]);

  const save = () => {
    const cleaned = recipients.filter((recipient) => Object.values(recipient).some((value) => String(value || '').trim()));
    saveRecipients(cleaned);
    toast('Recipient list updated', 'success');
    closeDialog('editRecipients');
  };

  return (
    <Modal title="Edit Recipient List" onClose={() => closeDialog('editRecipients')} width={760}>
      <Stack gap={14}>
        <div style={{ maxHeight: 340, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
          {recipients.map((recipient, index) => (
            <div key={index} style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['FirstName', 'LastName', 'Address', 'City', 'State', 'Zip', 'Email'].map((field) => (
                  <Input
                    key={field}
                    value={recipient[field] || ''}
                    onChange={(value) => updateField(index, field, value)}
                    placeholder={field}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={addRecipient}>Add Recipient</Button>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button variant="subtle" onClick={() => closeDialog('editRecipients')}>Cancel</Button>
            <Button variant="primary" onClick={save}>Save Changes</Button>
          </div>
        </div>
      </Stack>
    </Modal>
  );
}

export function InsertMergeFieldDialog() {
  const { closeDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [field, setField] = useState('FirstName');
  const [customField, setCustomField] = useState('');

  const insertField = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }

    const name = (customField.trim() || field.trim()).replace(/[^A-Za-z0-9_]/g, '');
    if (!name) {
      toast('Choose or enter a merge field name', 'info');
      return;
    }

    insertHtml(editor, `{{${name}}}`);
    toast(`Merge field inserted: ${name}`, 'success');
    closeDialog('insertMergeField');
  };

  return (
    <Modal title="Insert Merge Field" onClose={() => closeDialog('insertMergeField')} width={460}>
      <Stack gap={14}>
        <div>
          <Label>Common Fields</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['FirstName', 'LastName', 'Address', 'City', 'State', 'Zip', 'Email'].map((item) => (
              <Button key={item} variant={field === item ? 'primary' : 'subtle'} onClick={() => setField(item)}>{item}</Button>
            ))}
          </div>
        </div>
        <div>
          <Label>Custom Field</Label>
          <Input value={customField} onChange={setCustomField} placeholder="Optional custom field" />
        </div>
        <div>
          <Label>Preview</Label>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', background: 'var(--bg-elevated)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
            {`{{${(customField.trim() || field).replace(/[^A-Za-z0-9_]/g, '') || 'Field'}}}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="subtle" onClick={() => closeDialog('insertMergeField')}>Cancel</Button>
          <Button variant="primary" onClick={insertField}>Insert Field</Button>
        </div>
      </Stack>
    </Modal>
  );
}

export function GreetingLineDialog() {
  const { closeDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [recipients] = useState(() => loadRecipients());
  const availableFields = useMemo(() => extractFields(recipients), [recipients]);
  const [mode, setMode] = useState('firstName');
  const [customGreeting, setCustomGreeting] = useState('Dear {{FirstName}},');

  useEffect(() => {
    if (!availableFields.length) return;
    if (!availableFields.includes('FirstName')) {
      setMode('custom');
      setCustomGreeting(`Dear {{${availableFields[0]}}},`);
    }
  }, [availableFields]);

  const buildGreeting = () => {
    if (mode === 'custom') {
      return customGreeting.trim() || 'Dear {{FirstName}},';
    }

    if (mode === 'lastName') {
      return 'Dear {{LastName}},';
    }

    if (mode === 'firstLast') {
      return 'Dear {{FirstName}} {{LastName}},';
    }

    return 'Dear {{FirstName}},';
  };

  const insertGreeting = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }

    const greeting = buildGreeting();
    insertHtml(editor, `<p>${greeting}</p>`);
    toast('Greeting line inserted', 'success');
    closeDialog('greetingLine');
  };

  return (
    <Modal title="Greeting Line" onClose={() => closeDialog('greetingLine')} width={520}>
      <Stack gap={14}>
        <div>
          <Label>Greeting Style</Label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant={mode === 'firstName' ? 'primary' : 'subtle'} onClick={() => setMode('firstName')}>Dear First Name</Button>
            <Button variant={mode === 'firstLast' ? 'primary' : 'subtle'} onClick={() => setMode('firstLast')}>Dear First and Last Name</Button>
            <Button variant={mode === 'lastName' ? 'primary' : 'subtle'} onClick={() => setMode('lastName')}>Dear Last Name</Button>
            <Button variant={mode === 'custom' ? 'primary' : 'subtle'} onClick={() => setMode('custom')}>Custom</Button>
          </div>
        </div>

        {mode === 'custom' && (
          <div>
            <Label>Custom Greeting</Label>
            <Input value={customGreeting} onChange={setCustomGreeting} placeholder="Dear {{FirstName}}," />
          </div>
        )}

        <div>
          <Label>Preview</Label>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', background: 'var(--bg-elevated)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
            {buildGreeting()}
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
          Uses your mail-merge recipient fields when available, like Microsoft Word’s greeting line.
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="subtle" onClick={() => closeDialog('greetingLine')}>Cancel</Button>
          <Button variant="primary" onClick={insertGreeting}>Insert Greeting</Button>
        </div>
      </Stack>
    </Modal>
  );
}

export function EnvelopesDialog() {
  const { closeDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [recipient, setRecipient] = useState('Recipient Name\nRecipient Street\nCity, State ZIP');
  const [sender, setSender] = useState('Sender Name\nSender Street\nCity, State ZIP');

  const insertEnvelope = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'error');
      return;
    }

    if (!recipient.trim() || !sender.trim()) {
      toast('Recipient and sender addresses are required', 'error');
      return;
    }

    const recipientEscaped = String(recipient).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const senderEscaped = String(sender).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const html = `
      <div style="border:1px solid #cfcfcf;padding:16px;margin:10px 0;min-height:140px;position:relative;background:#fff;">
        <div style="font-size:18px;font-weight:700;margin-bottom:14px;">Envelope</div>
        <div style="font-size:15px;line-height:1.5;white-space:pre-line;">${recipientEscaped}</div>
        <div style="position:absolute;left:16px;bottom:12px;font-size:12px;color:#666;white-space:pre-line;">From: ${senderEscaped}</div>
      </div>
    `;

    try {
      insertHtml(editor, html);
      toast('✓ Envelope inserted', 'success');
      closeDialog('envelopes');
    } catch (error) {
      toast('Failed to insert envelope: ' + error?.message, 'error');
    }
  };

  return (
    <Modal title="Envelopes" onClose={() => closeDialog('envelopes')} width={560}>
      <Stack gap={14}>
        <div>
          <Label>Recipient Address</Label>
          <Input value={recipient} onChange={setRecipient} placeholder="Recipient address" rows={4} />
        </div>
        <div>
          <Label>Return Address</Label>
          <Input value={sender} onChange={setSender} placeholder="Sender address" rows={3} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="subtle" onClick={() => closeDialog('envelopes')}>Cancel</Button>
          <Button variant="primary" onClick={insertEnvelope}>Insert Envelope</Button>
        </div>
      </Stack>
    </Modal>
  );
}

export function LabelsDialog() {
  const { closeDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [recipients, setRecipients] = useState(() => loadRecipients());
  const [columns, setColumns] = useState(2);
  const [rows, setRows] = useState(5);

  const insertLabels = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'error');
      return;
    }

    if (!recipients.length) {
      toast('No recipients available. Add recipients first', 'error');
      return;
    }

    if (columns < 1 || rows < 1) {
      toast('Columns and rows must be at least 1', 'error');
      return;
    }

    try {
      const list = recipients.slice(0, rows * columns);
      const cells = Array.from({ length: rows * columns }, (_, index) => {
        const recipient = list[index] || {};
        const text = [recipient.FirstName, recipient.LastName, recipient.Address, [recipient.City, recipient.State, recipient.Zip].filter(Boolean).join(' ')].filter(Boolean).join('<br />') || '&nbsp;';
        return `<td style="border:1px solid #ccc;padding:10px;vertical-align:top;width:${100 / columns}%;height:72px;">${text}</td>`;
      });

      const tableRows = Array.from({ length: rows }, (_, rowIndex) => {
        const start = rowIndex * columns;
        return `<tr>${cells.slice(start, start + columns).join('')}</tr>`;
      }).join('');

      insertHtml(editor, `<table style="border-collapse:collapse;width:100%;margin:12px 0;table-layout:fixed;">${tableRows}</table>`);
      toast(`✓ Label sheet inserted (${rows}x${columns})`, 'success');
      closeDialog('labels');
    } catch (error) {
      toast('Failed to insert labels: ' + error?.message, 'error');
    }
  };

  return (
    <Modal title="Labels" onClose={() => closeDialog('labels')} width={560}>
      <Stack gap={14}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <Label>Columns</Label>
            <Input value={String(columns)} onChange={(v) => setColumns(Math.max(1, Math.min(4, Number(v) || 1)))} />
          </div>
          <div>
            <Label>Rows</Label>
            <Input value={String(rows)} onChange={(v) => setRows(Math.max(1, Math.min(10, Number(v) || 1)))} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
          Inserts a label grid using your selected recipients.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="subtle" onClick={() => closeDialog('labels')}>Cancel</Button>
          <Button variant="primary" onClick={insertLabels}>Insert Labels</Button>
        </div>
      </Stack>
    </Modal>
  );
}

export function PreviewMergeDialog() {
  const { closeDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [recipients] = useState(() => loadRecipients());
  const [index, setIndex] = useState(0);

  const current = recipients[index] || null;
  const previewHtml = current ? mergeDocumentHtml(editor?.getHTML() || '', current) : '';

  const insertPreview = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }

    if (!current) {
      toast('No recipients available', 'info');
      return;
    }

    editor.commands.setContent(previewHtml, false);
    toast(`Preview generated for ${current.FirstName || 'recipient'}`, 'success');
    closeDialog('finishMerge');
  };

  const insertAllMerged = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }

    if (!recipients.length) {
      toast('No recipients available', 'info');
      return;
    }

    const template = editor.getHTML();
    const merged = recipients.map((recipient) => mergeDocumentHtml(template, recipient)).join('<div style="page-break-after:always;"></div>');
    editor.commands.setContent(merged, false);
    toast('Merged copies generated', 'success');
    closeDialog('finishMerge');
  };

  return (
    <Modal title="Finish & Merge" onClose={() => closeDialog('finishMerge')} width={760}>
      <Stack gap={14}>
        <div>
          <Label>Preview Recipient</Label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="subtle" onClick={() => setIndex((value) => Math.max(0, value - 1))}>Previous</Button>
            <Button variant="subtle" onClick={() => setIndex((value) => Math.min(recipients.length - 1, value + 1))}>Next</Button>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', alignSelf: 'center' }}>
              {current ? `${current.FirstName || ''} ${current.LastName || ''}`.trim() || 'Recipient' : 'No recipients'}
            </div>
          </div>
        </div>

        <div>
          <Label>Preview Output</Label>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', background: 'var(--bg-elevated)', minHeight: 160, maxHeight: 260, overflow: 'auto', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
            {previewHtml ? <div dangerouslySetInnerHTML={{ __html: previewHtml }} /> : 'No preview available.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={() => closeDialog('finishMerge')}>Close</Button>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={insertPreview}>Insert Current Preview</Button>
            <Button variant="primary" onClick={insertAllMerged}>Merge All</Button>
          </div>
        </div>
      </Stack>
    </Modal>
  );
}