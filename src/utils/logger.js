import { createLogger, format as _format, transports as _transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: _format.combine(
    // _format.timestamp(),
    _format.simple()
  ),
  transports: [new _transports.Console()],
});

export default logger;
