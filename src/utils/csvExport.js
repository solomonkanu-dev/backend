import { Parser } from 'json2csv';

export const sendCsv = (res, filename, fields, data) => {
  if (!data || data.length === 0) {
    return res.status(404).json({ success: false, message: 'No data available for export' });
  }
  const parser = new Parser({ fields });
  const csv = parser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};
