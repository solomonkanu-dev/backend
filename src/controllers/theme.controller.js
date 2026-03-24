import Theme from '../models/Theme.js';
import mongoose from 'mongoose';

export const createTheme = async (req, res) => {
  try {
    const { name, description, primary, secondary, accent, success, danger, warning, info, dark, light, fontFamily, fontSize, logo, favicon, backgroundImage } = req.body;
    const instituteId = req.user?.institute || req.body.institute;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Theme name is required' });
    }

    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'Institute ID is required' });
    }

    const theme = await Theme.create({
      name: name.trim(),
      description,
      institute: instituteId,
      primary,
      secondary,
      accent,
      success,
      danger,
      warning,
      info,
      dark,
      light,
      fontFamily,
      fontSize,
      logo,
      favicon,
      backgroundImage,
      createdBy: req.user?._id,
    });

    res.status(201).json({ success: true, data: theme });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getThemes = async (req, res) => {
  try {
    const { instituteId, isActive, page = 1, limit = 20 } = req.query;
    const query = {};

    if (instituteId) query.institute = instituteId;
    else if (req.user?.institute) query.institute = req.user.institute;

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const [themes, total] = await Promise.all([
      Theme.find(query)
        .populate('createdBy', 'fullName email')
        .skip((pageNum - 1) * lim)
        .limit(lim)
        .sort({ createdAt: -1 }),
      Theme.countDocuments(query),
    ]);

    res.json({ success: true, data: themes, meta: { page: pageNum, limit: lim, total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getThemeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid theme ID' });
    }

    const theme = await Theme.findById(id).populate('createdBy', 'fullName email');

    if (!theme) {
      return res.status(404).json({ success: false, message: 'Theme not found' });
    }

    res.json({ success: true, data: theme });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActiveTheme = async (req, res) => {
  try {
    const instituteId = req.user?.institute || req.query.institute;

    if (!instituteId) {
      return res.status(400).json({ success: false, message: 'Institute ID is required' });
    }

    const theme = await Theme.findOne({ institute: instituteId, isActive: true });

    if (!theme) {
      return res.status(404).json({ success: false, message: 'No active theme found' });
    }

    res.json({ success: true, data: theme });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTheme = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, primary, secondary, accent, success, danger, warning, info, dark, light, fontFamily, fontSize, logo, favicon, backgroundImage, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid theme ID' });
    }

    const theme = await Theme.findById(id);

    if (!theme) {
      return res.status(404).json({ success: false, message: 'Theme not found' });
    }

    // Update fields
    if (name) theme.name = name.trim();
    if (description !== undefined) theme.description = description;
    if (primary) theme.primary = primary;
    if (secondary) theme.secondary = secondary;
    if (accent) theme.accent = accent;
    if (success) theme.success = success;
    if (danger) theme.danger = danger;
    if (warning) theme.warning = warning;
    if (info) theme.info = info;
    if (dark) theme.dark = dark;
    if (light) theme.light = light;
    if (fontFamily) theme.fontFamily = fontFamily;
    if (fontSize) theme.fontSize = fontSize;
    if (logo) theme.logo = logo;
    if (favicon) theme.favicon = favicon;
    if (backgroundImage) theme.backgroundImage = backgroundImage;

    // If setting this theme as active, deactivate others for same institute
    if (isActive === true) {
      await Theme.updateMany({ institute: theme.institute, _id: { $ne: id } }, { isActive: false });
      theme.isActive = true;
    } else if (isActive === false) {
      theme.isActive = false;
    }

    await theme.save();
    res.json({ success: true, data: theme });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTheme = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid theme ID' });
    }

    const theme = await Theme.findByIdAndDelete(id);

    if (!theme) {
      return res.status(404).json({ success: false, message: 'Theme not found' });
    }

    res.json({ success: true, data: theme, message: 'Theme deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  createTheme,
  getThemes,
  getThemeById,
  getActiveTheme,
  updateTheme,
  deleteTheme,
};
