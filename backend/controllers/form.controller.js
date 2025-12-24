import { Form } from '../models/form.model.js';
import { User } from '../models/user.model.js';

const buildOptionId = (index) => `opt_${Date.now()}_${index}`;

const resolveOwnerInfo = async (formDocument) => {
  const json = formDocument.toJSON();
  const ownerRef = formDocument.ownerId || formDocument.ownerEmail || formDocument.ownerName;

  if (!ownerRef) {
    return { ...json, ownerName: json.ownerName || null, ownerEmail: json.ownerEmail || null };
  }

  try {
    const ownerId = formDocument.ownerId || json.ownerId;

    if (ownerId) {
      const userDoc = await User.findById(ownerId).select('name email').lean();
      if (userDoc) {
        json.ownerName = userDoc.name || null;
        json.ownerEmail = userDoc.email || null;
        json.ownerId = userDoc._id?.toString?.() || json.ownerId;
        return json;
      }
    }

    const ownerEmail = formDocument.ownerEmail || json.ownerEmail;
    if (ownerEmail) {
      const userDoc = await User.findOne({ email: ownerEmail }).select('name email _id').lean();
      if (userDoc) {
        json.ownerName = userDoc.name || null;
        json.ownerEmail = userDoc.email || ownerEmail;
        json.ownerId = userDoc._id?.toString?.() || json.ownerId;
        return json;
      }
    }
  } catch (error) {
    console.error('resolveOwnerInfo error:', error);
  }

  return json;
};

const isFormOwner = (formDocument, user = {}) => {
  if (!formDocument || !user) return false;

  const formOwnerId = formDocument.ownerId ? formDocument.ownerId.toString() : null;
  const userId = user.id || user._id || null;
  if (formOwnerId && userId && formOwnerId === userId.toString()) {
    return true;
  }

  const formOwnerEmail = (formDocument.ownerEmail || '').toLowerCase();
  const userEmail = (user.email || '').toLowerCase();
  if (formOwnerEmail && userEmail && formOwnerEmail === userEmail) {
    return true;
  }

  return false;
};

const canUserViewForm = (formDocument, user = {}) => {
  const role = (user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'owner') return true;
  if (!user) return false;

  const scope = formDocument?.visibility?.scope || 'company';
  const departments = formDocument?.visibility?.departments || [];
  const teams = formDocument?.visibility?.teams || [];
  const users = (formDocument?.visibility?.users || []).map((u) => u?.toString?.() || u);
  const userId = user?.id?.toString?.() || user?._id?.toString?.() || '';
  const userDept = user?.department || user?.departmentId || '';
  const userTeams = Array.isArray(user?.teamNames) ? user.teamNames : [];

  if (scope === 'company') return true;

  if (scope === 'users') {
    return userId && users.includes(userId);
  }

  if (scope === 'department') {
    if (!userDept) return false;
    return departments.some((d) => d && userDept && d.toString() === userDept.toString());
  }

  if (scope === 'team') {
    if (!Array.isArray(userTeams) || userTeams.length === 0) return false;
    return userTeams.some((name) => teams.includes(name));
  }

  return false;
};

export async function getForms(req, res) {
  try {
    const user = req.user || {};
    const role = (user?.role || '').toLowerCase();
    const forms = await Form.find().sort({ isPinned: -1, pinnedAt: -1, createdAt: -1 });

    const filtered =
      role === 'admin' || role === 'owner'
        ? forms
        : forms.filter((form) => canUserViewForm(form, user));

    const enriched = await Promise.all(filtered.map(resolveOwnerInfo));
    res.json(enriched);
  } catch (error) {
    console.error('getForms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getFormById(req, res) {
  try {
    const { formId } = req.params;
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (!canUserViewForm(form, req.user)) {
      return res.status(403).json({ error: 'You are not allowed to view this form' });
    }

    const enriched = await resolveOwnerInfo(form);
    res.json(enriched);
  } catch (error) {
    console.error('getFormById error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function createForm(req, res) {
  try {
    const payload = req.body || {};
    const options = Array.isArray(payload.options) ? payload.options : [];
    const now = Date.now();

    const optionsWithIds = options.map((opt, idx) => ({
      id: `opt_${now}_${idx}`,
      text: typeof opt === 'string' ? opt : opt?.text || '',
      votes: 0,
      voters: [],
    }));

    const ownerId = req.user?._id || req.user?.id || null;
    const ownerEmail = (req.user?.email || null);
    const ownerName = req.user?.name || null;

    const isPinned = !!payload?.settings?.pinToTop;
    const pinnedAt = isPinned ? now : null;

    const visibility = {
      scope: payload?.visibility?.scope || 'company',
      departments: Array.isArray(payload?.visibility?.departments)
        ? payload.visibility.departments.map((d) => d?.toString?.() || d)
        : [],
      teams: Array.isArray(payload?.visibility?.teams) ? payload.visibility.teams : [],
      users: Array.isArray(payload?.visibility?.users)
        ? payload.visibility.users.filter(Boolean)
        : [],
    };

    const form = await Form.create({
      title: payload.title?.trim() || '',
      options: optionsWithIds,
      duration: payload.duration || 'forever',
      settings: payload.settings || {},
      isPinned,
      pinnedAt,
      ownerId,
      ownerEmail,
      ownerName,
      visibility,
    });

    const enriched = await resolveOwnerInfo(form);
    res.status(201).json(enriched);
  } catch (error) {
    console.error('createForm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function deleteForm(req, res) {
  try {
    const { formId } = req.params;
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (!isFormOwner(form, req.user)) {
      return res.status(403).json({ error: 'Only the creator can modify this form' });
    }

    await form.deleteOne();
    res.sendStatus(204);
  } catch (error) {
    console.error('deleteForm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function addOptionToForm(req, res) {
  try {
    const { formId } = req.params;
    const { text } = req.body || {};

    const cleanText = (text || '').trim();
    if (!cleanText) {
      return res.status(400).json({ error: 'Missing option content' });
    }

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const settings = form.settings || {};
    if (!settings.allowAddOptions) {
      return res.status(403).json({ error: 'This form does not allow adding options' });
    }

    const optionId = buildOptionId(form.options.length);
    form.options.push({ id: optionId, text: cleanText, votes: 0, voters: [] });

    await form.save();

    res.status(201).json({ id: optionId, text: cleanText, votes: 0, voters: [] });
  } catch (error) {
    console.error('addOptionToForm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateFormOptions(req, res) {
  try {
    const { formId } = req.params;
    const { options } = req.body || {};

    if (!Array.isArray(options)) {
      return res.status(400).json({ error: 'Options payload must be an array' });
    }

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const incoming = new Map();
    options.forEach((option) => {
      if (option?.id) {
        incoming.set(option.id, (option.text || '').trim());
      }
    });

    form.options = form.options.map((existing) => {
      if (!incoming.has(existing.id)) {
        return existing;
      }
      const nextText = incoming.get(existing.id);
      if (nextText) {
        existing.text = nextText;
      }
      return existing;
    });

    await form.save();

    const enriched = await resolveOwnerInfo(form);
    res.json(enriched);
  } catch (error) {
    console.error('updateFormOptions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function deleteOptionFromForm(req, res) {
  try {
    const { formId, optionId } = req.params;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (!isFormOwner(form, req.user)) {
      return res.status(403).json({ error: 'Only the creator can modify this form' });
    }

    const index = form.options.findIndex((opt) => opt.id === optionId);
    if (index === -1) {
      return res.status(404).json({ error: 'Option not found' });
    }

    form.options.splice(index, 1);
    await form.save();

    res.sendStatus(204);
  } catch (error) {
    console.error('deleteOptionFromForm error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

const matchVoter = (voter, target) => {
  if (!voter) return false;
  if (typeof voter === 'string') {
    return voter === target.name;
  }
  if (target.id && voter.id) {
    return String(voter.id) === String(target.id);
  }
  if (target.email && voter.email) {
    return voter.email === target.email;
  }
  return voter.name === target.name;
};

export async function voteOption(req, res) {
  try {
    const { formId, optionId } = req.params;
    const { voter, voterName, replace } = req.body || {};

    if (!voter && !voterName) {
      return res.status(400).json({ error: 'Missing voter identification' });
    }

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const voterInfo = {
      id: voter?.id || null,
      email: voter?.email || null,
      name: voter?.name || voterName || 'Anonymous',
    };

    const settings = form.settings || {};
    const allowMultiple = !!settings.allowMultiple;

    if (!allowMultiple || replace) {
      form.options.forEach((opt) => {
        if (opt.id === optionId || !Array.isArray(opt.voters)) return;
        const index = opt.voters.findIndex((existing) => matchVoter(existing, voterInfo));
        if (index !== -1) {
          opt.voters.splice(index, 1);
          opt.votes = Math.max(0, (opt.votes || 0) - 1);
        }
      });
    }

    let optionFound = false;
    form.options.forEach((opt) => {
      if (opt.id !== optionId) return;
      optionFound = true;
      if (!Array.isArray(opt.voters)) {
        opt.voters = [];
      }
      const alreadyVoted = opt.voters.some((existing) => matchVoter(existing, voterInfo));
      if (!alreadyVoted) {
        opt.voters.push(voterInfo);
        opt.votes = (opt.votes || 0) + 1;
      }
    });

    if (!optionFound) {
      return res.status(404).json({ error: 'Option not found' });
    }

    await form.save();

    res.json({ success: true });
  } catch (error) {
    console.error('voteOption error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
