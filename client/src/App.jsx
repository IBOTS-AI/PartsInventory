import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Menu,
  Select,
  Switch,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography,
   Checkbox,
  FormControlLabel,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import LocalPrintshopRoundedIcon from '@mui/icons-material/LocalPrintshopRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import BookmarkAddedRoundedIcon from '@mui/icons-material/BookmarkAddedRounded';
import BookmarkRemoveRoundedIcon from '@mui/icons-material/BookmarkRemoveRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import TvRoundedIcon from '@mui/icons-material/TvRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import './App.css';

const movementOptions = [
  { type: 'ADD', label: 'Add stock', icon: <AddRoundedIcon /> },
  { type: 'REMOVE', label: 'Remove stock', icon: <RemoveRoundedIcon /> },
  { type: 'ADJUST', label: 'Adjust count', icon: <TuneRoundedIcon /> },
  { type: 'TRANSFER', label: 'Transfer stock', icon: <SwapHorizRoundedIcon /> },
  { type: 'RESERVE', label: 'Reserve stock', icon: <BookmarkAddedRoundedIcon /> },
  { type: 'UNRESERVE', label: 'Unreserve stock', icon: <BookmarkRemoveRoundedIcon /> },
];

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Unable to load inventory');
  return response.json();
}

function imageSource(image) {
  return image?.externalUrl || image?.localPath || '';
}

function App() {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('ibots-theme') || 'light');
  const [logo, setLogo] = useState(() => localStorage.getItem('ibots-logo') || '');
  const [shopName, setShopName] = useState(() => localStorage.getItem('ibots-shop-name') || 'IBOTS inventory');
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem('ibots-operator') || 'Shop kiosk');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('ibots-accent') || '#1d5d70');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appMode, setAppMode] = useState(() => localStorage.getItem('ibots-mode') || 'admin');
  const [adminPasscode, setAdminPasscode] = useState(() => localStorage.getItem('ibots-admin-passcode') || '2370');
  const [adminPasscodeDialog, setAdminPasscodeDialog] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [configuration, setConfiguration] = useState(null);
  const [parts, setParts] = useState([]);
  const [tags, setTags] = useState([]);
  const [locations, setLocations] = useState([]);
  const [locationBrowserItems, setLocationBrowserItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [search, setSearch] = useState('');
  const [tagId, setTagId] = useState('all');
  const [supplierId, setSupplierId] = useState('all');
  const [supplierSort, setSupplierSort] = useState('name-asc');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [movement, setMovement] = useState(null);
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [selectedPart, setSelectedPart] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [reserverName, setReserverName] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [maintenanceRunning, setMaintenanceRunning] = useState(false);
  const [labelPart, setLabelPart] = useState(null);
  const [labelLocation, setLabelLocation] = useState(null);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', target: 'both', showTag: true, showSku: true, showManufacturerNumber: true, showLocation: true, showContents: true, showQrCode: true, accentColor: '#1d5d70' });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [editLocationDialog, setEditLocationDialog] = useState(false);
  const [editLocationForm, setEditLocationForm] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({ partId: 'all', locationId: 'all', type: 'all' });
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [newSupplierDialog, setNewSupplierDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [supplierForm, setSupplierForm] = useState({ supplierId: '', supplierPartNumber: '', productUrl: '', unitPrice: '', preferred: false });
  const [supplierManagerOpen, setSupplierManagerOpen] = useState(false);
  const [supplierManagerSearch, setSupplierManagerSearch] = useState('');
  const [supplierManagerForm, setSupplierManagerForm] = useState(null);
  const [supplierManagerLoading, setSupplierManagerLoading] = useState(false);
  const [supplierStatusConfirm, setSupplierStatusConfirm] = useState(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [latestBackupFile, setLatestBackupFile] = useState('');
  const [locationDeleteImpact, setLocationDeleteImpact] = useState(null);
  const [partDeleteImpact, setPartDeleteImpact] = useState(null);
  const [archivePartDialog, setArchivePartDialog] = useState(false);
  const [editPartDialog, setEditPartDialog] = useState(false);
  const [editPartForm, setEditPartForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const labelCanvas = useRef(null);
  const [createDialog, setCreateDialog] = useState(null);
  const [tagDialog, setTagDialog] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [tagManagerLoading, setTagManagerLoading] = useState(false);
  const [editingTagId, setEditingTagId] = useState(null);
  const [tagDeleteImpact, setTagDeleteImpact] = useState(null);
  const [tagForm, setTagForm] = useState({ name: '', code: '', color: '#1d5d70', description: '' });
  const [tagFieldError, setTagFieldError] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', sku: '', tagIds: [], description: '', manufacturer: '', manufacturerPartNumber: '', weightGrams: '', sourceUrl: '', supplierPrice: '', unitOfMeasure: 'each', aliases: '', imageUrl: '', supplierId: '', productUrl: '', code: '', locationType: 'bin', locationColor: '#1d5d70', parentId: '' });
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importOptions, setImportOptions] = useState([]);
  const [selectedImportOptions, setSelectedImportOptions] = useState([]);
  const [navMenuAnchor, setNavMenuAnchor] = useState(null);
  const [importData, setImportData] = useState(null);
  const appTheme = createTheme({
    palette: themeMode === 'dark'
      ? { mode: 'dark', primary: { main: accentColor }, secondary: { main: '#ff9475' }, background: { default: '#171a1c', paper: '#242a2d' }, text: { primary: '#f4f7f5', secondary: '#c1cfcc' }, divider: '#465256' }
      : { mode: 'light', primary: { main: accentColor }, secondary: { main: '#e06e4e' } },
  });

  const openSettings = async () => {
    setSettingsOpen(true);
    try { setConfiguration(await getJson('/api/configuration')); } catch (settingsError) { setError(settingsError.message); }
  };

  const saveSettings = () => {
    localStorage.setItem('ibots-theme', themeMode);
    localStorage.setItem('ibots-logo', logo);
    localStorage.setItem('ibots-shop-name', shopName);
    localStorage.setItem('ibots-operator', operatorName);
    localStorage.setItem('ibots-accent', accentColor);
    if (!/^\d{4}$/.test(adminPasscode)) {
      setError('Admin passcode must be exactly four digits');
      return;
    }
    localStorage.setItem('ibots-admin-passcode', adminPasscode);
    setSettingsOpen(false);
    setNotice('Settings saved');
  };

  const runDatabaseMaintenance = async (action, uploadFile = null) => {
    setMaintenanceRunning(true);
    try {
      const init = { method: 'POST' };
      if (action === 'restore' && uploadFile) {
        const formData = new FormData();
        formData.append('database', uploadFile);
        init.body = formData;
      }
      const response = await fetch(`/api/maintenance/${action}`, init);
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Database ${action} failed`);
      }
      if (action === 'backup') {
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition') || '';
        const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        const filename = filenameMatch?.[1] || 'ibots-backup.db';
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
        setLatestBackupFile(filename);
        setNotice('Database backup downloaded');
      } else {
        const result = await response.json();
        setNotice(uploadFile ? `Database restored from ${uploadFile.name}` : 'Database restore complete');
        if (result.output) {
          const match = result.output.match(/Backup created: (.+)$/m);
          if (match?.[1]) setLatestBackupFile(match[1].trim());
        }
      }
    } catch (maintenanceError) {
      setError(maintenanceError.message);
    } finally {
      setMaintenanceRunning(false);
    }
  };

  const isAdmin = appMode === 'admin';
  const enterKioskMode = () => {
    setAppMode('kiosk');
    localStorage.setItem('ibots-mode', 'kiosk');
  };

  const requestAdminMode = () => {
    setEnteredPasscode('');
    setPasscodeError('');
    setAdminPasscodeDialog(true);
  };

  const unlockAdminMode = () => {
    if (enteredPasscode !== adminPasscode) {
      setPasscodeError('Incorrect passcode');
      return;
    }
    setAppMode('admin');
    localStorage.setItem('ibots-mode', 'admin');
    setAdminPasscodeDialog(false);
  };

  const handleLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  };

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [partData, tagData, locationData, templateData, supplierData] = await Promise.all([
        getJson(`/api/parts?${new URLSearchParams({ ...(search ? { search } : {}), ...(includeInactive ? { includeInactive: 'true' } : {}), ...(supplierId !== 'all' ? { supplierId } : {}) })}`),
        getJson('/api/tags'),
        getJson('/api/locations'),
        getJson('/api/label-templates'),
        getJson('/api/suppliers'),
      ]);
      setParts(partData);
      setTags(tagData);
      setLocations(locationData);
      setTemplates(templateData);
      setSuppliers(supplierData);
      setSelectedTemplateId((current) => current || String(templateData[0]?.id || ''));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [includeInactive, search, supplierId]);

  useEffect(() => {
    const timer = setTimeout(loadInventory, 250);
    return () => clearTimeout(timer);
  }, [loadInventory]);

  const supplierNameForPart = (part) => part.suppliers?.[0]?.supplier?.name || '';
  const tagFilteredParts =
    tagId === 'all' ? parts : parts.filter((part) => part.tags.some(({ id }) => id === Number(tagId)));
  const visibleParts = [...tagFilteredParts].sort((left, right) => {
    if (supplierSort === 'name-desc') return right.name.localeCompare(left.name);
    if (supplierSort === 'supplier-asc') {
      const leftSupplier = supplierNameForPart(left);
      const rightSupplier = supplierNameForPart(right);
      if (!leftSupplier && !rightSupplier) return left.name.localeCompare(right.name);
      if (!leftSupplier) return 1;
      if (!rightSupplier) return -1;
      return leftSupplier.localeCompare(rightSupplier) || left.name.localeCompare(right.name);
    }
    if (supplierSort === 'supplier-desc') {
      const leftSupplier = supplierNameForPart(left);
      const rightSupplier = supplierNameForPart(right);
      if (!leftSupplier && !rightSupplier) return left.name.localeCompare(right.name);
      if (!leftSupplier) return 1;
      if (!rightSupplier) return -1;
      return rightSupplier.localeCompare(leftSupplier) || left.name.localeCompare(right.name);
    }
    return left.name.localeCompare(right.name);
  });
  const visibleSuppliers = suppliers.filter((supplier) => supplier.name.toLowerCase().includes(supplierManagerSearch.toLowerCase()));
  const labelTemplateTarget = labelPart ? 'part' : 'location';
  const availableTemplates = templates.filter(
    (template) => template.target === 'both' || template.target === labelTemplateTarget,
  );
  const selectedTemplate = availableTemplates.find(
    (template) => String(template.id) === String(selectedTemplateId),
  ) || availableTemplates[0];
  const labelTemplateValue = availableTemplates.some(
    (template) => String(template.id) === String(selectedTemplateId),
  )
    ? selectedTemplateId
    : '';

  const openMovement = (part, action) => {
    setMovement({ part, ...action });
    const defaultLocation =
      part.inventory[0]?.locationId || part.homeLocationId || locations[0]?.id || '';
    setSourceLocationId(String(defaultLocation));
    setDestinationLocationId('');
    setQuantity('');
    setMovementNote('');
    setReserverName('');
  };

  const openPartDetails = async (part) => {
    setDetailLoading(true);
    setSelectedPart(part);
    try {
      setSelectedPart(await getJson(`/api/parts/${part.id}${includeInactive ? '?includeInactive=true' : ''}`));
    } catch (loadError) {
      setError(loadError.message);
      setSelectedPart(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openSupplierDialog = () => {
    setSupplierForm({ supplierId: suppliers[0]?.id || '', supplierPartNumber: '', productUrl: '', unitPrice: '', preferred: false });
    setSupplierDialog(true);
  };

  const openPartEditor = () => {
    setEditPartForm({
      name: selectedPart.name,
      tagIds: selectedPart.tags.map((tag) => tag.id),
      description: selectedPart.description || '',
      manufacturer: selectedPart.manufacturer || '',
      manufacturerPartNumber: selectedPart.manufacturerPartNumber || '',
      manufacturerUrl: selectedPart.manufacturerUrl || '',
      unitOfMeasure: selectedPart.unitOfMeasure,
      minimumQuantity: selectedPart.minimumQuantity,
      reorderQuantity: selectedPart.reorderQuantity,
      homeLocationId: selectedPart.homeLocationId || '',
      active: selectedPart.active,
      aliases: selectedPart.aliases.map((alias) => alias.alias).join(', '),
      imageUrl: imageSource(selectedPart.images.find((image) => image.isPrimary)) || '',
    });
    setImageFile(null);
    setEditPartDialog(true);
  };

  const savePart = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/parts/${selectedPart.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...editPartForm, imageUrl: undefined, aliases: editPartForm.aliases.split(',').map((alias) => alias.trim()).filter(Boolean), minimumQuantity: Number(editPartForm.minimumQuantity), reorderQuantity: Number(editPartForm.reorderQuantity), homeLocationId: editPartForm.homeLocationId ? Number(editPartForm.homeLocationId) : null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update part');
      if (imageFile) {
        const imageData = new FormData();
        imageData.append('image', imageFile);
        const imageResponse = await fetch(`/api/parts/${selectedPart.id}/images`, { method: 'POST', body: imageData });
        const imageResult = await imageResponse.json();
        if (!imageResponse.ok) throw new Error(imageResult.error || 'Unable to upload image');
      }
      if (!imageFile && editPartForm.imageUrl && editPartForm.imageUrl !== imageSource(selectedPart.images.find((image) => image.isPrimary))) {
        const imageResponse = await fetch(`/api/parts/${selectedPart.id}/images/from-url`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: editPartForm.imageUrl }) });
        const imageResult = await imageResponse.json();
        if (!imageResponse.ok) throw new Error(imageResult.error || 'Unable to download image');
      }
      setEditPartDialog(false);
      setNotice('Part updated');
      await openPartDetails(selectedPart);
      await loadInventory();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const archivePart = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/parts/${selectedPart.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: selectedPart.name, tagIds: selectedPart.tags.map((tag) => tag.id), active: false, aliases: selectedPart.aliases.map((alias) => alias.alias) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Unable to archive part');
      setArchivePartDialog(false);
      setSelectedPart(null);
      setNotice(`${selectedPart.name} made inactive`);
      await loadInventory();
    } catch (archiveError) {
      setError(archiveError.message);
    } finally {
      setSaving(false);
    }
  };

  const openPartDeleteImpact = async () => {
    if (!selectedPart?.id) return;
    setSaving(true);
    try {
      setPartDeleteImpact(await getJson(`/api/parts/${selectedPart.id}/impact`));
    } catch (impactError) {
      setError(impactError.message);
    } finally {
      setSaving(false);
    }
  };

  const deletePart = async () => {
    if (!partDeleteImpact?.id) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/parts/${partDeleteImpact.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete part');
      setPartDeleteImpact(null);
      setSelectedPart(null);
      setNotice('Part deleted');
      await loadInventory();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveSupplierLink = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/parts/${selectedPart.id}/suppliers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...supplierForm, supplierId: Number(supplierForm.supplierId), unitPrice: supplierForm.unitPrice || undefined }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save supplier');
      setSupplierDialog(false);
      setNotice('Supplier link saved');
      await openPartDetails(selectedPart);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const saveNewSupplier = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newSupplierName }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create supplier');
      setSuppliers((current) => [...current, result].sort((left, right) => left.name.localeCompare(right.name)));
      setSupplierForm((current) => ({ ...current, supplierId: result.id }));
      setNewSupplierDialog(false);
      setNewSupplierName('');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const openSupplierManager = async () => {
    setSupplierManagerOpen(true);
    setSupplierManagerLoading(true);
    try {
      const result = await getJson('/api/suppliers?includeInactive=true');
      setSuppliers(result);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setSupplierManagerLoading(false);
    }
  };

  const openSupplierEditor = (supplier = null) => {
    setSupplierManagerForm(supplier
      ? { id: supplier.id, name: supplier.name, website: supplier.website || '', phone: supplier.phone || '', email: supplier.email || '', notes: supplier.notes || '', active: supplier.active }
      : { name: '', website: '', phone: '', email: '', notes: '', active: true });
  };

  const saveSupplier = async () => {
    if (!supplierManagerForm?.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(supplierManagerForm.id ? `/api/suppliers/${supplierManagerForm.id}` : '/api/suppliers', {
        method: supplierManagerForm.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierManagerForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save supplier');
      setSuppliers((current) => [...current.filter((item) => item.id !== result.id), result].sort((left, right) => left.name.localeCompare(right.name)));
      setSupplierManagerForm(null);
      setNotice(supplierManagerForm.id ? 'Supplier updated' : 'Supplier created');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmSupplierStatusChange = async () => {
    if (!supplierStatusConfirm?.id) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/suppliers/${supplierStatusConfirm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supplierStatusConfirm.name,
          website: supplierStatusConfirm.website || '',
          phone: supplierStatusConfirm.phone || '',
          email: supplierStatusConfirm.email || '',
          notes: supplierStatusConfirm.notes || '',
          active: !supplierStatusConfirm.active,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update supplier status');
      setSuppliers((current) => [...current.filter((item) => item.id !== result.id), result].sort((left, right) => left.name.localeCompare(right.name)));
      setNotice(result.active ? 'Supplier reactivated' : 'Supplier deactivated');
      setSupplierStatusConfirm(null);
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const labelData = labelPart || labelLocation;
    if (!labelData || !labelCanvas.current) return;
    const canvas = labelCanvas.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    const primaryTag = labelPart?.tags?.[0];
    const tagColor = labelLocation?.color || labelPart?.homeLocation?.color || selectedTemplate?.accentColor || primaryTag?.color || '#1d5d70';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 1200, 600);
    context.fillStyle = tagColor;
    context.fillRect(0, 0, 42, 600);
    context.fillStyle = '#18242c';
    const title = labelPart?.name || labelLocation.name;
    let titleSize = 58;
    do {
      context.font = `700 ${titleSize}px Arial`;
      titleSize -= 1;
    } while (context.measureText(title).width > 560 && titleSize >= 22);
    context.font = `700 ${Math.max(titleSize, 22)}px Arial`;
    context.fillText(title, 82, 118);
    context.font = '500 32px Arial';
    if (selectedTemplate?.showSku || !selectedTemplate) context.fillText(labelPart ? `SKU  ${labelPart.sku || `ID-${labelPart.id}`}` : `CODE  ${labelLocation.code}`, 82, 178);
    context.font = '500 28px Arial';
    if (selectedTemplate?.showTag || !selectedTemplate) context.fillText(labelPart ? `${(labelPart.tags || []).map((tag) => tag.name).join(', ') || 'UNTAGGED'}  /  ${labelPart.unitOfMeasure}` : `${labelLocation.locationType.toUpperCase()}  /  ${labelLocation.inventory.length} PARTS`, 82, 230);
    context.fillStyle = '#68767a';
    context.font = '500 25px Arial';
    if (selectedTemplate?.showLocation || !selectedTemplate) context.fillText(labelPart ? `LOCATION  ${labelPart.homeLocation?.name || labelPart.inventory[0]?.location?.name || 'UNASSIGNED'}` : `LOCATION CODE  ${labelLocation.code}`, 82, 300);
    if (selectedTemplate?.showManufacturerNumber && labelPart?.manufacturerPartNumber) context.fillText(`MPN  ${labelPart.manufacturerPartNumber.slice(0, 30)}`, 82, 340);
    if (!labelPart && labelLocation.description) {
      context.fillStyle = '#68767a';
      context.font = '500 25px Arial';
      const words = labelLocation.description.split(/\s+/);
      const lines = [];
      let line = '';
      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width > 520 && line) {
          lines.push(line);
          line = word;
        } else line = candidate;
      });
      if (line) lines.push(line);
      lines.slice(0, 2).forEach((descriptionLine, index) => context.fillText(descriptionLine, 82, 340 + index * 32));
    }
    const thumbnailUrl = labelPart && imageSource(labelPart.images?.find((image) => image.isPrimary));
    if (thumbnailUrl) {
      const thumbnail = new Image();
      thumbnail.crossOrigin = 'anonymous';
      thumbnail.onload = () => {
        const panelX = 660;
        const panelY = 0;
        const panelWidth = 540;
        const panelHeight = 600;
        context.fillStyle = '#ffffff';
        context.fillRect(panelX, panelY, panelWidth, panelHeight);
        const scale = Math.max(panelWidth / thumbnail.naturalWidth, panelHeight / thumbnail.naturalHeight);
        const width = thumbnail.naturalWidth * scale;
        const height = thumbnail.naturalHeight * scale;
        const offsetX = panelX + (panelWidth - width) / 2;
        const offsetY = panelY + (panelHeight - height) / 2;
        context.drawImage(thumbnail, offsetX, offsetY, width, height);
      };
      thumbnail.src = thumbnailUrl;
    }
    if (!labelPart || !selectedTemplate?.showQrCode) return;
    QRCode.toDataURL(`${window.location.origin}/${labelPart ? 'parts' : 'locations'}/${labelData.qrCode}`, { margin: 1, width: 250 })
      .then((url) => {
        const image = new Image();
        image.onload = () => context.drawImage(image, 82, 340, 210, 210);
        image.src = url;
      });
  }, [labelPart, labelLocation, selectedTemplate]);

  const downloadLabel = () => {
    const labelData = labelPart || labelLocation;
    if (!labelCanvas.current || !labelData) return;
    const link = document.createElement('a');
    link.download = `${labelPart?.sku || labelLocation.code}-label.png`;
    link.href = labelCanvas.current.toDataURL('image/png', 1);
    link.click();
  };

  const openLabel = (data, target) => {
    const template = templates.find((item) => item.target === 'both' || item.target === target);
    setSelectedTemplateId(String(template?.id || ''));
    setSelectedPart(null);
    setSelectedLocation(null);
    if (target === 'part') {
      setLabelLocation(null);
      setLabelPart(data);
    } else {
      setLabelPart(null);
      setLabelLocation(data);
    }
  };

  const openTemplateEditor = () => {
    setTemplateForm({ name: '', target: labelPart ? 'part' : 'location', showTag: selectedTemplate?.showTag ?? true, showSku: selectedTemplate?.showSku ?? true, showManufacturerNumber: selectedTemplate?.showManufacturerNumber ?? true, showLocation: selectedTemplate?.showLocation ?? true, showContents: selectedTemplate?.showContents ?? true, showQrCode: selectedTemplate?.showQrCode ?? true, accentColor: selectedTemplate?.accentColor || '#1d5d70' });
    setTemplateEditorOpen(true);
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/label-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(templateForm) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save template');
      setTemplates((current) => [...current, result]);
      setSelectedTemplateId(String(result.id));
      setTemplateEditorOpen(false);
      setNotice('Label template saved');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const openLocationDetails = async (location) => {
    setLocationLoading(true);
    setSelectedLocation(location);
    try {
      setSelectedLocation(await getJson(`/api/locations/${location.id}`));
    } catch (loadError) {
      setError(loadError.message);
      setSelectedLocation(null);
    } finally {
      setLocationLoading(false);
    }
  };

  const openLocationBrowser = async () => {
    try {
      setLocationBrowserItems(await getJson('/api/locations'));
    } catch (loadError) {
      setError(loadError.message);
      setLocationBrowserItems(locations);
    }
    setSelectedLocation({ browse: true });
  };

  const openLocationEditor = (location) => {
    setEditLocationForm({ name: location.name, code: location.code, locationType: location.locationType, parentId: location.parentId || '', description: location.description || '', color: location.color || '#1d5d70' });
    setEditLocationDialog({ id: location.id });
  };

  const saveLocation = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/locations/${editLocationDialog.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...editLocationForm, parentId: editLocationForm.parentId ? Number(editLocationForm.parentId) : '' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update location');
      setEditLocationDialog(false);
      setNotice('Location updated');
      await loadInventory();
      await openLocationBrowser();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const openLocationDeleteImpact = async (location) => {
    setSaving(true);
    try {
      setLocationDeleteImpact(await getJson(`/api/locations/${location.id}/impact`));
    } catch (impactError) {
      setError(impactError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async () => {
    if (!locationDeleteImpact?.id) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/locations/${locationDeleteImpact.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete location');
      setLocationDeleteImpact(null);
      setNotice('Location deleted');
      await loadInventory();
      await openLocationBrowser();
      if (selectedLocation?.id === locationDeleteImpact.id) setSelectedLocation({ browse: true });
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSaving(false);
    }
  };

  const openLowStockReport = async () => {
    setReportLoading(true);
    try {
      setReport(await getJson('/api/reports/low-stock'));
    } catch (reportError) {
      setError(reportError.message);
    } finally {
      setReportLoading(false);
    }
  };

  const openHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (historyFilters.partId !== 'all') params.set('partId', historyFilters.partId);
      if (historyFilters.locationId !== 'all') params.set('locationId', historyFilters.locationId);
      if (historyFilters.type !== 'all') params.set('type', historyFilters.type);
      setHistory(await getJson(`/api/reports/history?${params}`));
    } catch (historyError) {
      setError(historyError.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const submitMovement = async () => {
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || (movement.type === 'ADJUST' ? amount === 0 : amount <= 0))
      return;
    if (['RESERVE', 'UNRESERVE'].includes(movement.type) && !reserverName.trim()) {
      setError(`Please enter the ${movement.type === 'RESERVE' ? 'reserver' : 'returned by'} name`);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId: movement.part.id,
          locationId: Number(sourceLocationId),
          destinationId: movement.type === 'TRANSFER' ? Number(destinationLocationId) : undefined,
          type: movement.type,
          quantity: movement.type === 'ADJUST' ? amount : amount,
          notes: ['RESERVE', 'UNRESERVE'].includes(movement.type)
            ? `${movement.type === 'RESERVE' ? 'Reserved for' : 'Unreserved by'} ${reserverName.trim()}${movementNote ? ` - ${movementNote}` : ''}`
            : movementNote || undefined,
          operatorName: ['RESERVE', 'UNRESERVE'].includes(movement.type) ? reserverName.trim() : operatorName || 'Shop kiosk',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save movement');
      setMovement(null);
      setNotice(`${movement.label} recorded for ${movement.part.name}`);
      await loadInventory();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreateDialog = (type) => {
    setCreateDialog(type);
    setImportUrl('');
    setImportOptions([]);
    setSelectedImportOptions([]);
    setImportData(null);
    setCreateForm({ name: '', sku: '', tagIds: tags[0]?.id ? [tags[0].id] : [], description: '', manufacturer: '', manufacturerPartNumber: '', weightGrams: '', sourceUrl: '', supplierPrice: '', unitOfMeasure: 'each', aliases: '', imageUrl: '', supplierId: suppliers[0]?.id || '', productUrl: '', code: '', locationType: 'bin', locationColor: '#1d5d70', parentId: '' });
  };

  const importPart = async () => {
    setImporting(true);
    try {
      const response = await fetch('/api/parts/import-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: importUrl }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to import product');
      const defaultOptions = result.options?.map((option) => option.values[0]) || [];
      setImportData(result);
      setImportOptions(result.options || []);
      setSelectedImportOptions(defaultOptions);
      const selectedVariant = result.variants?.find((variant) => variant.options.every((value, index) => value === defaultOptions[index]));
      setCreateForm((current) => ({
        ...current,
        name: result.name || current.name,
        sku: selectedVariant?.sku || result.sku || current.sku,
        description: current.description,
        manufacturer: result.manufacturer || current.manufacturer,
        manufacturerPartNumber: result.manufacturerPartNumber || current.manufacturerPartNumber,
        weightGrams: (selectedVariant?.weightGrams || result.weightGrams) ? String(Math.round((selectedVariant?.weightGrams || result.weightGrams) * 100) / 100) : current.weightGrams,
        sourceUrl: result.url,
        supplierPrice: (selectedVariant?.price || result.price) ? String(selectedVariant?.price || result.price) : current.supplierPrice,
        imageUrl: selectedVariant?.imageUrl || result.imageUrl || current.imageUrl,
      }));
      setNotice('Product details imported. Review them before creating the part.');
    } catch (importError) {
      setError(importError.message);
    } finally {
      setImporting(false);
    }
  };

  const openTagManager = async () => {
    setTagManagerOpen(true);
    setTagManagerLoading(true);
    try {
      setTags(await getJson('/api/tags'));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setTagManagerLoading(false);
    }
  };

  const closeTagDialog = () => {
    setTagDialog(false);
    setEditingTagId(null);
    setTagFieldError('');
    setTagForm({ name: '', code: '', color: '#1d5d70', description: '' });
  };

  const openTagDialogForCreate = () => {
    setEditingTagId(null);
    setTagFieldError('');
    setTagForm({ name: '', code: '', color: '#1d5d70', description: '' });
    setTagDialog(true);
  };

  const openTagDialogForEdit = (tag) => {
    setEditingTagId(tag.id);
    setTagFieldError('');
    setTagForm({
      name: tag.name,
      code: tag.code || '',
      color: tag.color || '#1d5d70',
      description: tag.description || '',
    });
    setTagDialog(true);
  };

  const saveTag = async () => {
    setSaving(true);
    setTagFieldError('');
    try {
      const isEditing = Boolean(editingTagId);
      const response = await fetch(isEditing ? `/api/tags/${editingTagId}` : '/api/tags', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Unable to ${isEditing ? 'update' : 'create'} tag`);
      setTags((current) => [...current.filter((tag) => tag.id !== result.id), result].sort((left, right) => left.name.localeCompare(right.name)));
      if (!isEditing && createDialog === 'part') setCreateForm((current) => ({ ...current, tagIds: [...current.tagIds, result.id] }));
      closeTagDialog();
      setNotice(isEditing ? 'Tag updated' : 'Tag created');
    } catch (saveError) {
      if (saveError?.message?.toLowerCase().includes('already exists')) {
        setTagFieldError(saveError.message);
      } else {
        setError(saveError.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const openTagDeleteImpact = async (tag) => {
    setSaving(true);
    try {
      setTagDeleteImpact(await getJson(`/api/tags/${tag.id}/impact`));
    } catch (impactError) {
      setError(impactError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTag = async () => {
    if (!tagDeleteImpact?.id) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/tags/${tagDeleteImpact.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete tag');
      setTags((current) => current.filter((tag) => tag.id !== tagDeleteImpact.id));
      setCreateForm((current) => ({ ...current, tagIds: current.tagIds.filter((id) => Number(id) !== Number(tagDeleteImpact.id)) }));
      if (String(tagId) === String(tagDeleteImpact.id)) setTagId('all');
      setTagDeleteImpact(null);
      setNotice('Tag deleted and removed from linked parts');
      await loadInventory();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = async () => {
    const isPart = createDialog === 'part';
    const payload = isPart
      ? { ...createForm, imageUrl: undefined, tagIds: createForm.tagIds.map(Number), aliases: createForm.aliases.split(',').map((alias) => alias.trim()).filter(Boolean), supplierId: createForm.supplierId ? Number(createForm.supplierId) : undefined }
      : { name: createForm.name, code: createForm.code, locationType: createForm.locationType, color: createForm.locationColor, parentId: createForm.parentId ? Number(createForm.parentId) : undefined };
    setSaving(true);
    try {
      const response = await fetch(`/api/${isPart ? 'parts' : 'locations'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Unable to create ${isPart ? 'part' : 'location'}`);
      if (isPart && createForm.imageUrl) {
        const imageResponse = await fetch(`/api/parts/${result.id}/images/from-url`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: createForm.imageUrl }) });
        const imageResult = await imageResponse.json();
        if (!imageResponse.ok) throw new Error(imageResult.error || 'Unable to download image');
      }
      setCreateDialog(null);
      setNotice(`${isPart ? 'Part' : 'Location'} created`);
      await loadInventory();
      if (!isPart) await openLocationBrowser();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemeProvider theme={appTheme}>
    <Box className={`${themeMode === 'dark' ? 'app-shell theme-dark' : 'app-shell'} ${appMode === 'kiosk' ? 'kiosk-mode' : ''}`} style={{ '--primary-accent': accentColor }}>
      <AppBar className="topbar" position="static" elevation={0}>
        <Toolbar className="topbar-inner">
          <Box className="brand-lockup">
            <Box className={logo ? 'brand-mark custom-brand-mark' : 'brand-mark'}>
              {logo ? <img src={logo} alt="" /> : <Inventory2RoundedIcon />}
            </Box>
            <Box>
              <Typography className="brand-name">{shopName}</Typography>
              <Typography className="brand-subtitle">Team 2370 / shop floor</Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip className="network-chip" label="LOCAL NETWORK" size="small" />
            <IconButton aria-label="Open navigation menu" onClick={(event) => setNavMenuAnchor(event.currentTarget)} color="inherit">
              <MenuRoundedIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      <Menu className="nav-menu" anchorEl={navMenuAnchor} open={Boolean(navMenuAnchor)} onClose={() => setNavMenuAnchor(null)}>
        {isAdmin ? [
          <MenuItem key="add-part" onClick={() => { setNavMenuAnchor(null); openCreateDialog('part'); }}><AddRoundedIcon fontSize="small" />Add part</MenuItem>,
          <MenuItem key="tags" onClick={() => { setNavMenuAnchor(null); openTagManager(); }}><LocalOfferRoundedIcon fontSize="small" />Tags</MenuItem>,
          <MenuItem key="needs-ordering" onClick={() => { setNavMenuAnchor(null); openLowStockReport(); }}><ReportProblemRoundedIcon fontSize="small" />Needs ordering</MenuItem>,
          <MenuItem key="history" onClick={() => { setNavMenuAnchor(null); openHistory(); }}><HistoryRoundedIcon fontSize="small" />History</MenuItem>,
          <MenuItem key="locations" onClick={() => { setNavMenuAnchor(null); openLocationBrowser(); }}><LocationCityRoundedIcon fontSize="small" />Locations</MenuItem>,
          <MenuItem key="settings" onClick={() => { setNavMenuAnchor(null); openSettings(); }}><SettingsRoundedIcon fontSize="small" />Settings</MenuItem>,
          <MenuItem key="kiosk" onClick={() => { setNavMenuAnchor(null); enterKioskMode(); }}><TvRoundedIcon fontSize="small" />Kiosk mode</MenuItem>,
        ] : (
          <MenuItem onClick={() => { setNavMenuAnchor(null); requestAdminMode(); }}><AdminPanelSettingsRoundedIcon fontSize="small" />Admin mode</MenuItem>
        )}
      </Menu>

      <Container className="inventory-container" maxWidth="lg">
        <Box className="page-heading">
          <Box>
            <Typography className="eyebrow">STOCKROOM / LIVE CATALOG</Typography>
            <Typography component="h1">Part Inventory System</Typography>
          </Box>
          <Box className="part-count">
            <strong>{visibleParts.length}</strong>
            <span>active parts</span>
          </Box>
          {isAdmin && <Button variant="contained" className="page-add-part" startIcon={<AddRoundedIcon />} onClick={() => openCreateDialog('part')}>Add part</Button>}
        </Box>

        <Box className="search-row">
          <TextField
            className="search-field"
            fullWidth
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, SKU, alias, or manufacturer number"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Select
            className="tag-select"
            value={tagId}
            onChange={(event) => setTagId(event.target.value)}
          >
            <MenuItem value="all">All tags</MenuItem>
            {tags.map((tag) => (
              <MenuItem key={tag.id} value={tag.id}>
                {tag.name}
              </MenuItem>
            ))}
          </Select>
          <Select
            className="supplier-select"
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
          >
            <MenuItem value="all">All suppliers</MenuItem>
            {suppliers.map((supplier) => (
              <MenuItem key={supplier.id} value={String(supplier.id)}>
                {supplier.name}
              </MenuItem>
            ))}
          </Select>
          <Select
            className="sort-select"
            value={supplierSort}
            onChange={(event) => setSupplierSort(event.target.value)}
          >
            <MenuItem value="name-asc">Sort: Part name A-Z</MenuItem>
            <MenuItem value="name-desc">Sort: Part name Z-A</MenuItem>
            <MenuItem value="supplier-asc">Sort: Supplier A-Z</MenuItem>
            <MenuItem value="supplier-desc">Sort: Supplier Z-A</MenuItem>
          </Select>
          <FormControlLabel
            control={<Checkbox checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />}
            label="Include inactive"
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
          />
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box className="loading-state">
            <CircularProgress size={32} />
            <Typography>Loading stockroom...</Typography>
          </Box>
        ) : visibleParts.length === 0 ? (
          <Box className="empty-state">
            <SearchRoundedIcon />
            <Typography variant="h6">No parts found</Typography>
            <Typography>Try another name, SKU, or tag.</Typography>
          </Box>
        ) : (
          <Stack className="part-list" spacing={1.5}>
            {visibleParts.map((part) => {
              const primaryTag = part.tags[0] || { name: 'Untagged', color: '#6b7b7f' };
              const locationColor = part.homeLocation?.color || part.inventory[0]?.location?.color || primaryTag.color;
              const lowStock = Number(part.totalQuantity) <= Number(part.minimumQuantity);
              return (
                <Box className="part-row" key={part.id}>
                  <Box className="tag-bar" sx={{ backgroundColor: locationColor }} />
                  {imageSource(part.images?.find((image) => image.isPrimary)) ? (
                    <Box className="part-thumb"><img src={imageSource(part.images.find((image) => image.isPrimary))} alt="" /></Box>
                  ) : <Box className="part-thumb placeholder"><Inventory2RoundedIcon /></Box>}
                  <Box
                    className="part-info"
                    role="button"
                    tabIndex={0}
                    onClick={() => openPartDetails(part)}
                    onKeyDown={(event) => event.key === 'Enter' && openPartDetails(part)}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                      useFlexGap
                    >
                      <Typography className="part-name">{part.name}</Typography>
                      <Chip
                        label={part.tags.map((tag) => tag.name).join(', ') || 'Untagged'}
                        size="small"
                        sx={{ backgroundColor: `${primaryTag.color}20`, color: primaryTag.color }}
                      />
                      {!part.active && <Chip label="Inactive" size="small" color="default" />}
                    </Stack>
                    <Typography className="part-meta">
                      {part.sku || `ID-${part.id}`}{' '}
                      {part.manufacturerPartNumber ? ` / ${part.manufacturerPartNumber}` : ''}
                      {supplierNameForPart(part) ? ` / ${supplierNameForPart(part)}` : ''}
                    </Typography>
                    <Stack
                      className="location-line"
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: 'center' }}
                    >
                      <LocationOnRoundedIcon />
                      <Typography>
                        {part.inventory.length
                          ? part.inventory
                              .map((row) => `${row.location.name} (${row.quantity})`)
                              .join(' / ')
                          : part.homeLocation?.name || 'No stock location'}
                      </Typography>
                    </Stack>
                  </Box>
                  <Box className="quantity-block">
                    <Typography className={lowStock ? 'quantity low-stock' : 'quantity'}>
                      {part.totalQuantity}
                    </Typography>
                    <Typography className="unit-label">{part.unitOfMeasure}</Typography>
                    {lowStock && <Chip label="LOW" size="small" color="warning" />}
                  </Box>
                  <Box className="action-stack">
                    <Box className="action-grid">
                      {part.active && (isAdmin ? movementOptions : movementOptions.filter((action) => ['ADD', 'REMOVE'].includes(action.type))).map((action) => (
                        <Button
                          key={action.type}
                          className={`action-button ${action.type.toLowerCase()}`}
                          variant="outlined"
                          startIcon={action.icon}
                          onClick={() => openMovement(part, action)}
                        >
                          {isAdmin ? action.label : action.type === 'ADD' ? 'Check in' : 'Check out'}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Container>

      <Dialog
        fullWidth
        maxWidth="xs"
        open={Boolean(movement)}
        onClose={() => !saving && setMovement(null)}
      >
        <DialogTitle>{movement?.label}</DialogTitle>
        <DialogContent>
          <Typography className="dialog-part-name">{movement?.part.name}</Typography>
          <Typography className="dialog-stock">
            Total stock: {movement?.part.totalQuantity} {movement?.part.unitOfMeasure}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Select
            fullWidth
            value={sourceLocationId}
            onChange={(event) => setSourceLocationId(event.target.value)}
            displayEmpty
          >
            <MenuItem value="" disabled>
              Select source location
            </MenuItem>
            {locations.map((location) => (
              <MenuItem key={location.id} value={location.id}>
                {location.name}
                {movement?.part.inventory.find((row) => row.locationId === location.id)
                  ? ` (${movement.part.inventory.find((row) => row.locationId === location.id).quantity} ${movement.part.unitOfMeasure})`
                  : ''}
              </MenuItem>
            ))}
          </Select>
          {movement?.type === 'TRANSFER' && (
            <Select
              fullWidth
              value={destinationLocationId}
              onChange={(event) => setDestinationLocationId(event.target.value)}
              displayEmpty
              sx={{ mt: 2 }}
            >
              <MenuItem value="" disabled>
                Select destination location
              </MenuItem>
              {locations
                .filter((location) => String(location.id) !== String(sourceLocationId))
                .map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
            </Select>
          )}
          {['RESERVE', 'UNRESERVE'].includes(movement?.type) && (
            <TextField
              fullWidth
              label={movement?.type === 'RESERVE' ? 'Reserved for (name)' : 'Unreserved by (name)'}
              value={reserverName}
              onChange={(event) => setReserverName(event.target.value)}
              sx={{ mt: 2 }}
            />
          )}
          <TextField
            autoFocus
            fullWidth
            type="number"
            label={movement?.type === 'ADJUST' ? 'Adjustment amount (+/-)' : 'Quantity'}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            slotProps={{
              htmlInput: { ...(movement?.type === 'ADJUST' ? {} : { min: 0 }), step: 'any' },
            }}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Note (optional)"
            value={movementNote}
            onChange={(event) => setMovementNote(event.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovement(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitMovement}
            disabled={
              saving ||
              !quantity ||
              !sourceLocationId ||
              (movement?.type === 'TRANSFER' && !destinationLocationId) ||
              (['RESERVE', 'UNRESERVE'].includes(movement?.type) && !reserverName.trim())
            }
          >
            {saving ? 'Saving...' : 'Record movement'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        fullWidth
        maxWidth="md"
        open={Boolean(selectedPart)}
        onClose={() => setSelectedPart(null)}
      >
        <DialogTitle>{selectedPart?.name}</DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box className="detail-loading">
              <CircularProgress size={28} />
            </Box>
          ) : (
            selectedPart && (
              <Stack spacing={3}>
                {imageSource(selectedPart.images?.find((image) => image.isPrimary)) && <Box className="detail-image"><img src={imageSource(selectedPart.images.find((image) => image.isPrimary))} alt={selectedPart.name} /></Box>}
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <Chip
                    label={selectedPart.tags.map((tag) => tag.name).join(', ') || 'Untagged'}
                    sx={{
                      backgroundColor: `${selectedPart.tags[0]?.color || '#6b7b7f'}20`,
                      color: selectedPart.tags[0]?.color || '#6b7b7f',
                    }}
                  />
                  <Typography className="detail-sku">{selectedPart.sku || `ID-${selectedPart.id}`}</Typography>
                </Stack>
                <Box className="detail-grid">
                  <Box>
                    <Typography className="detail-label">Total stock</Typography>
                    <Typography className="detail-value">
                      {selectedPart.totalQuantity} {selectedPart.unitOfMeasure}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography className="detail-label">Minimum desired</Typography>
                    <Typography className="detail-value">
                      {selectedPart.minimumQuantity} {selectedPart.unitOfMeasure}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography className="detail-label">Reorder amount</Typography>
                    <Typography className="detail-value">
                      {selectedPart.reorderQuantity} {selectedPart.unitOfMeasure}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography className="detail-label">Home location</Typography>
                    <Typography className="detail-value">
                      {selectedPart.homeLocation?.name || 'Not assigned'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography className="detail-label">Stock by location</Typography>
                  <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
                    {selectedPart.inventory.length ? (
                      selectedPart.inventory.map((row) => (
                        <Stack
                          key={row.id}
                          direction="row"
                          sx={{ justifyContent: 'space-between' }}
                          py={1}
                        >
                          <Typography>{row.location.name}</Typography>
                          <Typography fontWeight={700}>
                            {row.quantity} {selectedPart.unitOfMeasure}
                          </Typography>
                        </Stack>
                      ))
                    ) : (
                      <Typography color="text.secondary" py={1}>
                        No stock recorded.
                      </Typography>
                    )}
                  </Stack>
                </Box>
                <Box>
                  <Typography className="detail-label">Search aliases</Typography>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {selectedPart.aliases.length ? (
                      selectedPart.aliases.map((alias) => (
                        <Chip key={alias.id} label={alias.alias} size="small" variant="outlined" />
                      ))
                    ) : (
                      <Typography color="text.secondary">No aliases yet.</Typography>
                    )}
                  </Stack>
                </Box>
                <Box>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography className="detail-label">Suppliers</Typography>
                    <Button size="small" startIcon={<StorefrontRoundedIcon />} onClick={openSupplierDialog}>Link supplier</Button>
                  </Stack>
                  <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
                    {selectedPart.suppliers.length ? selectedPart.suppliers.map((link) => <Stack key={link.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} py={1}><Box><Typography fontWeight={600}>{link.supplier.name} {link.preferred && <Chip label="Preferred" size="small" color="success" />}</Typography><Typography variant="caption" color="text.secondary">{link.supplierPartNumber || 'No supplier part number'}</Typography>{link.productUrl && <Typography component="a" href={link.productUrl} target="_blank" rel="noreferrer" variant="caption" display="block">Where to buy</Typography>}</Box><Typography fontWeight={700}>{link.unitPrice ? `$${Number(link.unitPrice).toFixed(2)}` : 'Price unknown'}</Typography></Stack>) : <Typography color="text.secondary" py={1}>No suppliers linked.</Typography>}
                  </Stack>
                </Box>
                <Box>
                  <Typography className="detail-label">Recent activity</Typography>
                  <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
                    {selectedPart.transactions.length ? (
                      selectedPart.transactions.map((transaction) => (
                        <Stack
                          key={transaction.id}
                          direction="row"
                          sx={{ justifyContent: 'space-between' }}
                          py={1}
                          gap={2}
                        >
                          <Box>
                            <Typography fontWeight={600}>{transaction.type}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {transaction.location?.name || 'Unassigned'}
                              {transaction.destination ? ` to ${transaction.destination.name}` : ''}
                            </Typography>
                          </Box>
                          <Typography fontWeight={700}>
                            {transaction.quantity > 0 ? '+' : ''}
                            {transaction.quantity}
                          </Typography>
                        </Stack>
                      ))
                    ) : (
                      <Typography color="text.secondary">No movements recorded.</Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button startIcon={<LocalPrintshopRoundedIcon />} onClick={() => openLabel(selectedPart, 'part')}>Label</Button>
          <Button onClick={openPartEditor}>Edit</Button>
          {selectedPart?.active && <Button color="error" onClick={() => setArchivePartDialog(true)}>Make inactive</Button>}
          <Button color="error" variant="outlined" onClick={openPartDeleteImpact}>Delete</Button>
          <Button onClick={() => setSelectedPart(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="xs" open={archivePartDialog} onClose={() => !saving && setArchivePartDialog(false)}>
        <DialogTitle>Make part inactive?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{selectedPart?.name} will leave the active catalog, but its inventory history, suppliers, and images will be preserved.</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setArchivePartDialog(false)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={archivePart} disabled={saving}>{saving ? 'Saving...' : 'Make inactive'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" open={Boolean(partDeleteImpact)} onClose={() => !saving && setPartDeleteImpact(null)}>
        <DialogTitle>Delete part?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography>Delete <strong>{partDeleteImpact?.name}</strong>{partDeleteImpact?.sku ? ` (${partDeleteImpact.sku})` : ''}?</Typography>
            <Alert severity="warning">This permanently removes the part. If stock or history exists, deletion is blocked and the part should be made inactive instead.</Alert>
            <Typography variant="body2" color="text.secondary">Linked records: {partDeleteImpact?.affectedCount || 0}</Typography>
            <Typography variant="body2">Inventory rows: {partDeleteImpact?.inventoryCount || 0}</Typography>
            <Typography variant="body2">Transactions: {partDeleteImpact?.transactionCount || 0}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setPartDeleteImpact(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={deletePart} disabled={saving}>{saving ? 'Deleting...' : 'Delete part'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" open={editPartDialog} onClose={() => !saving && setEditPartDialog(false)}>
        <DialogTitle>Edit part</DialogTitle>
        <DialogContent>
          {editPartForm && <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField required label="Name" value={editPartForm.name} onChange={(event) => setEditPartForm({ ...editPartForm, name: event.target.value })} />
            <Select multiple value={editPartForm.tagIds} onChange={(event) => setEditPartForm({ ...editPartForm, tagIds: event.target.value })} renderValue={(selected) => tags.filter((tag) => selected.includes(tag.id)).map((tag) => tag.name).join(', ')}>{tags.map((tag) => <MenuItem key={tag.id} value={tag.id}>{tag.name}</MenuItem>)}</Select>
            <TextField multiline minRows={2} label="Description" value={editPartForm.description} onChange={(event) => setEditPartForm({ ...editPartForm, description: event.target.value })} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Manufacturer" value={editPartForm.manufacturer} onChange={(event) => setEditPartForm({ ...editPartForm, manufacturer: event.target.value })} /><TextField fullWidth label="Manufacturer part number" value={editPartForm.manufacturerPartNumber} onChange={(event) => setEditPartForm({ ...editPartForm, manufacturerPartNumber: event.target.value })} /></Stack>
            <TextField label="Manufacturer URL" type="url" value={editPartForm.manufacturerUrl} onChange={(event) => setEditPartForm({ ...editPartForm, manufacturerUrl: event.target.value })} />
            <Stack direction="row" spacing={2}><TextField fullWidth label="Unit" value={editPartForm.unitOfMeasure} onChange={(event) => setEditPartForm({ ...editPartForm, unitOfMeasure: event.target.value })} /><TextField fullWidth type="number" label="Minimum" value={editPartForm.minimumQuantity} onChange={(event) => setEditPartForm({ ...editPartForm, minimumQuantity: event.target.value })} /></Stack>
            <Stack direction="row" spacing={2}><TextField fullWidth type="number" label="Reorder quantity" value={editPartForm.reorderQuantity} onChange={(event) => setEditPartForm({ ...editPartForm, reorderQuantity: event.target.value })} /><Select fullWidth value={editPartForm.homeLocationId} onChange={(event) => setEditPartForm({ ...editPartForm, homeLocationId: event.target.value })} displayEmpty><MenuItem value="">No home location</MenuItem>{locations.map((location) => <MenuItem key={location.id} value={location.id}>{location.name}</MenuItem>)}</Select></Stack>
            <TextField label="Image URL" type="url" value={editPartForm.imageUrl} onChange={(event) => setEditPartForm({ ...editPartForm, imageUrl: event.target.value })} />
            <Button component="label" variant="outlined">{imageFile ? imageFile.name : 'Upload part photo'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></Button>
            <TextField label="Aliases" helperText="Separate aliases with commas" value={editPartForm.aliases} onChange={(event) => setEditPartForm({ ...editPartForm, aliases: event.target.value })} />
            <FormControlLabel control={<Checkbox checked={editPartForm.active} onChange={(event) => setEditPartForm({ ...editPartForm, active: event.target.checked })} />} label="Active part" />
          </Stack>}
        </DialogContent>
        <DialogActions><Button onClick={() => setEditPartDialog(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={savePart} disabled={saving || !editPartForm?.name.trim()}>{saving ? 'Saving...' : 'Save part'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" open={supplierDialog} onClose={() => !saving && setSupplierDialog(false)}>
        <DialogTitle>Link supplier</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Select fullWidth value={supplierForm.supplierId} onChange={(event) => setSupplierForm({ ...supplierForm, supplierId: event.target.value })} displayEmpty>
              <MenuItem value="" disabled>Select supplier</MenuItem>
              {suppliers.map((supplier) => <MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>)}
            </Select>
            <Button startIcon={<AddRoundedIcon />} onClick={() => setNewSupplierDialog(true)}>Create supplier</Button>
            <TextField label="Supplier part number" value={supplierForm.supplierPartNumber} onChange={(event) => setSupplierForm({ ...supplierForm, supplierPartNumber: event.target.value })} />
            <TextField label="Product URL" type="url" value={supplierForm.productUrl} onChange={(event) => setSupplierForm({ ...supplierForm, productUrl: event.target.value })} />
            <TextField label="Unit price" type="number" value={supplierForm.unitPrice} onChange={(event) => setSupplierForm({ ...supplierForm, unitPrice: event.target.value })} slotProps={{ htmlInput: { min: 0, step: '0.01' } }} />
            <FormControlLabel control={<Checkbox checked={supplierForm.preferred} onChange={(event) => setSupplierForm({ ...supplierForm, preferred: event.target.checked })} />} label="Preferred supplier" />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSupplierDialog(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveSupplierLink} disabled={saving || !supplierForm.supplierId}>{saving ? 'Saving...' : 'Save supplier'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="xs" open={newSupplierDialog} onClose={() => !saving && setNewSupplierDialog(false)}>
        <DialogTitle>New supplier</DialogTitle>
        <DialogContent><TextField autoFocus fullWidth label="Supplier name" value={newSupplierName} onChange={(event) => setNewSupplierName(event.target.value)} sx={{ mt: 1 }} /></DialogContent>
        <DialogActions><Button onClick={() => setNewSupplierDialog(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveNewSupplier} disabled={saving || !newSupplierName.trim()}>Create supplier</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="md" open={supplierManagerOpen} onClose={() => !saving && setSupplierManagerOpen(false)}>
        <DialogTitle>Supplier management</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search suppliers"
                value={supplierManagerSearch}
                onChange={(event) => setSupplierManagerSearch(event.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> } }}
              />
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => openSupplierEditor()}>New supplier</Button>
            </Stack>
            {supplierManagerLoading ? <Box className="detail-loading"><CircularProgress size={28} /></Box> : visibleSuppliers.length ? (
              <Stack divider={<Divider flexItem />}>
                {visibleSuppliers.map((supplier) => (
                  <Stack key={supplier.id} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }} py={1.5}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                        <Typography fontWeight={700}>{supplier.name}</Typography>
                        {!supplier.active && <Chip label="Inactive" size="small" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{supplier.website || supplier.email || supplier.phone || 'No contact details'}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button className="tag-action edit" variant="outlined" size="small" startIcon={<EditRoundedIcon />} onClick={() => openSupplierEditor(supplier)}>Edit</Button>
                      <Button className="tag-action delete" variant="outlined" size="small" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setSupplierStatusConfirm(supplier)}>{supplier.active ? 'Deactivate' : 'Reactivate'}</Button>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            ) : <Box className="empty-state"><StorefrontRoundedIcon /><Typography>No suppliers found.</Typography></Box>}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSupplierManagerOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="xs" open={Boolean(supplierStatusConfirm)} onClose={() => !saving && setSupplierStatusConfirm(null)}>
        <DialogTitle>{supplierStatusConfirm?.active ? 'Deactivate supplier?' : 'Reactivate supplier?'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography>{supplierStatusConfirm?.active ? `Deactivate ${supplierStatusConfirm?.name}? Existing linked parts stay unchanged, but it will be hidden from new selections.` : `Reactivate ${supplierStatusConfirm?.name}? It will become available for new parts again.`}</Typography>
            {supplierStatusConfirm?.active && <Alert severity="warning">Historical supplier links are preserved.</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSupplierStatusConfirm(null)} disabled={saving}>Cancel</Button><Button variant="contained" color={supplierStatusConfirm?.active ? 'error' : 'primary'} onClick={confirmSupplierStatusChange} disabled={saving}>{saving ? 'Saving...' : supplierStatusConfirm?.active ? 'Deactivate' : 'Reactivate'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" open={Boolean(supplierManagerForm)} onClose={() => !saving && setSupplierManagerForm(null)}>
        <DialogTitle>{supplierManagerForm?.id ? 'Edit supplier' : 'New supplier'}</DialogTitle>
        <DialogContent>
          {supplierManagerForm && <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField required label="Supplier name" value={supplierManagerForm.name} onChange={(event) => setSupplierManagerForm({ ...supplierManagerForm, name: event.target.value })} />
            <TextField label="Website" type="url" value={supplierManagerForm.website} onChange={(event) => setSupplierManagerForm({ ...supplierManagerForm, website: event.target.value })} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Phone" value={supplierManagerForm.phone} onChange={(event) => setSupplierManagerForm({ ...supplierManagerForm, phone: event.target.value })} /><TextField fullWidth label="Email" type="email" value={supplierManagerForm.email} onChange={(event) => setSupplierManagerForm({ ...supplierManagerForm, email: event.target.value })} /></Stack>
            <TextField multiline minRows={2} label="Notes" value={supplierManagerForm.notes} onChange={(event) => setSupplierManagerForm({ ...supplierManagerForm, notes: event.target.value })} />
            <FormControlLabel control={<Checkbox checked={supplierManagerForm.active} onChange={(event) => setSupplierManagerForm({ ...supplierManagerForm, active: event.target.checked })} />} label="Active supplier" />
          </Stack>}
        </DialogContent>
        <DialogActions><Button onClick={() => setSupplierManagerForm(null)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveSupplier} disabled={saving || !supplierManagerForm?.name.trim()}>{saving ? 'Saving...' : 'Save supplier'}</Button></DialogActions>
      </Dialog>
      <Dialog className="storage-locations-dialog" fullWidth maxWidth="sm" open={Boolean(selectedLocation)} onClose={() => setSelectedLocation(null)}>
        <DialogTitle>{selectedLocation?.browse ? 'Storage locations' : selectedLocation?.name}</DialogTitle>
        <DialogContent>
          {selectedLocation?.browse ? (
            <Box className="location-grid">
              <Button className="location-add-row" startIcon={<LocationCityRoundedIcon />} onClick={() => openCreateDialog('location')}>Add location</Button>
              {locationBrowserItems.map((location) => <Box className="location-browser-row" key={location.id}><Box className="location-color-bar" sx={{ backgroundColor: location.color || '#1d5d70' }} /><Button onClick={() => openLocationDetails(location)}><Box><Typography fontWeight={700}>{location.name}</Typography><Typography variant="caption" color="text.secondary">{location.code} / {location.locationType}</Typography></Box></Button><Stack className="location-actions" direction="column" spacing={1}><Button className="tag-action edit location-action-button" variant="outlined" size="small" startIcon={<EditRoundedIcon />} onClick={() => openLocationEditor(location)}>Edit</Button><Button className="tag-action delete location-action-button" variant="outlined" size="small" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => openLocationDeleteImpact(location)}>Delete</Button></Stack></Box>)}
            </Box>
          ) : locationLoading ? <Box className="detail-loading"><CircularProgress size={28} /></Box> : selectedLocation && <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Chip label={selectedLocation.locationType} size="small" /><Typography className="detail-sku">{selectedLocation.code}</Typography></Stack>
            <Typography color="text.secondary">{selectedLocation.parent ? `Parent: ${selectedLocation.parent.name}` : 'Top-level location'}</Typography>
            <Typography className="detail-label">Contents</Typography>
            {selectedLocation.inventory.length ? selectedLocation.inventory.map((row) => <Stack key={row.id} direction="row" sx={{ justifyContent: 'space-between' }}><Typography>{row.part.name}</Typography><Typography fontWeight={700}>{row.quantity} {row.part.unitOfMeasure}</Typography></Stack>) : <Typography color="text.secondary">No parts stored here.</Typography>}
          </Stack>}
        </DialogContent>
        <DialogActions>{selectedLocation && !selectedLocation.browse && <><Button startIcon={<LocalPrintshopRoundedIcon />} onClick={() => openLabel(selectedLocation, 'location')}>Label</Button><Button onClick={() => openLocationEditor(selectedLocation)}>Edit</Button></>}<Button onClick={() => setSelectedLocation(null)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" open={Boolean(locationDeleteImpact)} onClose={() => !saving && setLocationDeleteImpact(null)}>
        <DialogTitle>Delete location?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography>Delete <strong>{locationDeleteImpact?.name}</strong> ({locationDeleteImpact?.code})?</Typography>
            <Alert severity="warning">Locations can only be deleted when they have no child locations, no stock, no home parts, and no transaction history.</Alert>
            <Typography variant="body2" color="text.secondary">Affected records: {locationDeleteImpact?.affectedCount || 0}</Typography>
            {locationDeleteImpact?.children?.length ? <Typography variant="body2">Child locations: {locationDeleteImpact.children.map((child) => `${child.name} (${child.code})`).join(', ')}</Typography> : null}
            {locationDeleteImpact?.inventoryParts?.length ? <Typography variant="body2">Stocked parts: {locationDeleteImpact.inventoryParts.map((part) => part.name).join(', ')}</Typography> : null}
            {locationDeleteImpact?.homeParts?.length ? <Typography variant="body2">Home-location parts: {locationDeleteImpact.homeParts.map((part) => part.name).join(', ')}</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setLocationDeleteImpact(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={deleteLocation} disabled={saving}>{saving ? 'Deleting...' : 'Delete location'}</Button></DialogActions>
      </Dialog>
      <Dialog className="edit-location-dialog" fullWidth maxWidth="sm" open={Boolean(editLocationDialog)} onClose={() => !saving && setEditLocationDialog(false)}>
        <DialogTitle>Edit location</DialogTitle>
        <DialogContent>
          {editLocationForm && <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField required label="Name" value={editLocationForm.name} onChange={(event) => setEditLocationForm({ ...editLocationForm, name: event.target.value })} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth required label="Code" value={editLocationForm.code} onChange={(event) => setEditLocationForm({ ...editLocationForm, code: event.target.value })} /><Select fullWidth value={editLocationForm.locationType} onChange={(event) => setEditLocationForm({ ...editLocationForm, locationType: event.target.value })}>{['shop', 'shelf', 'section', 'bin', 'other'].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</Select><TextField fullWidth label="Color" type="color" value={editLocationForm.color} onChange={(event) => setEditLocationForm({ ...editLocationForm, color: event.target.value })} slotProps={{ htmlInput: { style: { height: 42 } } }} /></Stack>
            <Select value={editLocationForm.parentId} onChange={(event) => setEditLocationForm({ ...editLocationForm, parentId: event.target.value })} displayEmpty><MenuItem value="">No parent (top-level)</MenuItem>{locations.filter((location) => location.id !== editLocationDialog.id).map((location) => <MenuItem key={location.id} value={location.id}>{location.name} ({location.code})</MenuItem>)}</Select>
            <TextField multiline minRows={2} label="Description" value={editLocationForm.description} onChange={(event) => setEditLocationForm({ ...editLocationForm, description: event.target.value })} />
          </Stack>}
        </DialogContent>
        <DialogActions><Button onClick={() => setEditLocationDialog(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveLocation} disabled={saving || !editLocationForm?.name.trim() || !editLocationForm?.code.trim()}>{saving ? 'Saving...' : 'Save location'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="md" open={Boolean(report)} onClose={() => setReport(null)}>
        <DialogTitle>Needs ordering</DialogTitle>
        <DialogContent>
          {reportLoading ? <Box className="detail-loading"><CircularProgress size={28} /></Box> : report && <>
            <Typography color="text.secondary" sx={{ mb: 2 }}>{report.count ? `${report.count} part${report.count === 1 ? '' : 's'} at or below minimum` : 'Everything is above minimum.'}</Typography>
            <Stack divider={<Divider flexItem />}>
              {report.items.map((item) => <Stack className="report-row" key={item.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} gap={2} py={1.5}>
                <Box sx={{ minWidth: 0, flex: 1 }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Box className="report-color" sx={{ backgroundColor: item.tags[0]?.color || '#6b7b7f' }} /><Typography fontWeight={700}>{item.name}</Typography></Stack><Typography variant="caption" color="text.secondary">{item.sku} / {item.supplier?.name || 'No preferred supplier'}</Typography></Box>
                <Box className="report-number"><Typography variant="caption" color="text.secondary">ON HAND</Typography><Typography fontWeight={700}>{item.onHand}</Typography></Box>
                <Box className="report-number"><Typography variant="caption" color="text.secondary">ORDER</Typography><Typography className="order-quantity">{item.suggestedQuantity}</Typography></Box>
                {item.unitPrice && <Typography variant="body2">${Number(item.unitPrice).toFixed(2)}</Typography>}
              </Stack>)}
            </Stack>
          </>}
        </DialogContent>
        <DialogActions><Button onClick={() => setReport(null)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="md" open={Boolean(history)} onClose={() => setHistory(null)}>
        <DialogTitle>Inventory history</DialogTitle>
        <DialogContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            <Select fullWidth size="small" value={historyFilters.partId} onChange={(event) => setHistoryFilters({ ...historyFilters, partId: event.target.value })}>
              <MenuItem value="all">All parts</MenuItem>
              {parts.map((part) => <MenuItem key={part.id} value={part.id}>{part.name}</MenuItem>)}
            </Select>
            <Select fullWidth size="small" value={historyFilters.locationId} onChange={(event) => setHistoryFilters({ ...historyFilters, locationId: event.target.value })}>
              <MenuItem value="all">All locations</MenuItem>
              {locations.map((location) => <MenuItem key={location.id} value={location.id}>{location.name}</MenuItem>)}
            </Select>
            <Select fullWidth size="small" value={historyFilters.type} onChange={(event) => setHistoryFilters({ ...historyFilters, type: event.target.value })}>
              <MenuItem value="all">All actions</MenuItem>
              {['ADD', 'REMOVE', 'ADJUST', 'TRANSFER', 'RESERVE', 'UNRESERVE'].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
            </Select>
            <Button variant="contained" onClick={openHistory} disabled={historyLoading}>{historyLoading ? 'Loading' : 'Filter'}</Button>
          </Stack>
          {historyLoading ? <Box className="detail-loading"><CircularProgress size={28} /></Box> : history?.length ? <Stack divider={<Divider flexItem />}>{history.map((transaction) => <Stack className="history-row" key={transaction.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} gap={2} py={1.5}><Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={700}>{transaction.part.name}</Typography><Typography variant="caption" color="text.secondary">{transaction.type} / {transaction.location?.name || 'Unassigned'}{transaction.destination ? ` to ${transaction.destination.name}` : ''}</Typography>{transaction.notes && <Typography variant="caption" display="block" color="text.secondary">{transaction.notes}</Typography>}</Box><Typography className={Number(transaction.quantity) < 0 ? 'history-quantity negative' : 'history-quantity'}>{Number(transaction.quantity) > 0 ? '+' : ''}{transaction.quantity}</Typography><Typography className="history-date" variant="caption">{new Date(transaction.createdAt).toLocaleString()}</Typography></Stack>)}</Stack> : <Box className="empty-state"><HistoryRoundedIcon /><Typography>No inventory movements match these filters.</Typography></Box>}
        </DialogContent>
        <DialogActions><Button onClick={() => setHistory(null)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog keepMounted className="label-dialog" fullWidth maxWidth="md" open={Boolean(labelPart || labelLocation)} onClose={() => { setLabelPart(null); setLabelLocation(null); }}>
        <DialogTitle>4 x 2 inch label</DialogTitle>
        <DialogContent>
          <Select fullWidth size="small" value={labelTemplateValue} onChange={(event) => setSelectedTemplateId(event.target.value)} sx={{ mb: 1 }}>
            {availableTemplates.map((template) => <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>)}
          </Select>
          <Typography className="label-subtitle">1200 x 600 px / 300 DPI target</Typography>
          <Box className="label-preview"><canvas ref={labelCanvas} width="1200" height="600" /></Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={openTemplateEditor}>Customize</Button>
          <Button startIcon={<DownloadRoundedIcon />} onClick={downloadLabel}>Download PNG</Button>
          <Button variant="contained" startIcon={<LocalPrintshopRoundedIcon />} onClick={() => window.print()}>Print / Save PDF</Button>
        </DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" open={templateEditorOpen} onClose={() => !saving && setTemplateEditorOpen(false)}>
        <DialogTitle>Customize label template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField required label="Template name" value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} />
            <TextField label="Accent color" type="color" value={templateForm.accentColor} onChange={(event) => setTemplateForm({ ...templateForm, accentColor: event.target.value })} slotProps={{ htmlInput: { style: { height: 42 } } }} />
            <Typography className="detail-label">Show on label</Typography>
            <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap' }}>
              {[['showTag', 'Tags'], ['showSku', 'SKU / code'], ['showManufacturerNumber', 'Manufacturer number'], ['showLocation', 'Location'], ['showContents', 'Contents'], ['showQrCode', 'QR code']].map(([key, label]) => <FormControlLabel key={key} control={<Checkbox checked={templateForm[key]} onChange={(event) => setTemplateForm({ ...templateForm, [key]: event.target.checked })} />} label={label} />)}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setTemplateEditorOpen(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveTemplate} disabled={saving || !templateForm.name.trim()}>{saving ? 'Saving...' : 'Save template'}</Button></DialogActions>
      </Dialog>
      <Dialog className="create-dialog" fullWidth maxWidth="sm" open={Boolean(createDialog)} onClose={() => !saving && setCreateDialog(null)}>
        <DialogTitle>{createDialog === 'part' ? 'Add a part' : 'Add a location'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Name" required value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} />
            {createDialog === 'part' ? <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField fullWidth label="Product website URL" placeholder="https://vendor.example/product" value={importUrl} onChange={(event) => setImportUrl(event.target.value)} />
                <Button variant="outlined" onClick={importPart} disabled={importing || !importUrl.trim()}>{importing ? 'Importing...' : 'Import details'}</Button>
              </Stack>
              {importOptions.map((option, optionIndex) => <Select key={option.name} fullWidth value={selectedImportOptions[optionIndex] || ''} onChange={(event) => {
                const nextOptions = [...selectedImportOptions];
                nextOptions[optionIndex] = event.target.value;
                setSelectedImportOptions(nextOptions);
                const variant = importData?.variants?.find((candidate) => candidate.options.every((value, index) => value === nextOptions[index]));
                if (variant) setCreateForm((current) => ({ ...current, sku: variant.sku || current.sku, supplierPrice: variant.price ? String(variant.price) : current.supplierPrice, weightGrams: variant.weightGrams ? String(Math.round(variant.weightGrams * 100) / 100) : current.weightGrams, imageUrl: variant.imageUrl || current.imageUrl }));
              }}><MenuItem value="" disabled>{option.name}</MenuItem>{option.values.map((value) => <MenuItem key={value} value={value}>{option.name}: {value}</MenuItem>)}</Select>)}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box className="tag-entry">
                  <Select fullWidth multiple value={createForm.tagIds} onChange={(event) => setCreateForm({ ...createForm, tagIds: event.target.value })} displayEmpty renderValue={(selected) => tags.filter((tag) => selected.includes(tag.id)).map((tag) => tag.name).join(', ')}>
                    <MenuItem value="" disabled>Tags</MenuItem>
                    {tags.map((tag) => <MenuItem key={tag.id} value={tag.id}>{tag.name}</MenuItem>)}
                  </Select>
                  <Button size="small" onClick={openTagManager}>Manage tags</Button>
                </Box>
                <TextField className="sku-entry" fullWidth label="SKU / inventory number (optional)" value={createForm.sku} onChange={(event) => setCreateForm({ ...createForm, sku: event.target.value })} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="Unit of measure" value={createForm.unitOfMeasure} onChange={(event) => setCreateForm({ ...createForm, unitOfMeasure: event.target.value })} />
                <TextField fullWidth type="number" label="Minimum desired" value={createForm.minimumQuantity || ''} onChange={(event) => setCreateForm({ ...createForm, minimumQuantity: event.target.value })} />
              </Stack>
              <TextField multiline minRows={2} label="Description" value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Manufacturer" value={createForm.manufacturer} onChange={(event) => setCreateForm({ ...createForm, manufacturer: event.target.value })} /><TextField fullWidth label="Manufacturer part number" value={createForm.manufacturerPartNumber} onChange={(event) => setCreateForm({ ...createForm, manufacturerPartNumber: event.target.value })} /></Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth type="number" label="Weight (grams)" value={createForm.weightGrams} onChange={(event) => setCreateForm({ ...createForm, weightGrams: event.target.value })} /><TextField fullWidth type="number" label="Supplier price" value={createForm.supplierPrice} onChange={(event) => setCreateForm({ ...createForm, supplierPrice: event.target.value })} /></Stack>
              <TextField label="Image URL" type="url" value={createForm.imageUrl || ''} onChange={(event) => setCreateForm({ ...createForm, imageUrl: event.target.value })} />
              <Stack spacing={1}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><Select fullWidth value={createForm.supplierId} onChange={(event) => setCreateForm({ ...createForm, supplierId: event.target.value })} displayEmpty><MenuItem value="">No supplier</MenuItem>{suppliers.filter((supplier) => supplier.active).map((supplier) => <MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>)}</Select><TextField fullWidth label="Where to buy URL" type="url" value={createForm.productUrl} onChange={(event) => setCreateForm({ ...createForm, productUrl: event.target.value })} /></Stack><Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={openSupplierManager}>Manage suppliers</Button></Stack>
              <TextField label="Aliases" helperText="Separate alternate search terms with commas" value={createForm.aliases} onChange={(event) => setCreateForm({ ...createForm, aliases: event.target.value })} />
            </> : <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="Code" required value={createForm.code} onChange={(event) => setCreateForm({ ...createForm, code: event.target.value })} />
                <Select fullWidth value={createForm.locationType} onChange={(event) => setCreateForm({ ...createForm, locationType: event.target.value })}>
                  {['shop', 'shelf', 'section', 'bin', 'other'].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                </Select>
                <TextField fullWidth className="location-color-input" label="Color" type="color" value={createForm.locationColor} onChange={(event) => setCreateForm({ ...createForm, locationColor: event.target.value })} slotProps={{ htmlInput: { style: { height: 75 } } }} />
              </Stack>
              <Select value={createForm.parentId} onChange={(event) => setCreateForm({ ...createForm, parentId: event.target.value })} displayEmpty>
                <MenuItem value="">No parent (top-level)</MenuItem>
                {locations.map((location) => <MenuItem key={location.id} value={location.id}>{location.name} ({location.code})</MenuItem>)}
              </Select>
            </>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate} disabled={saving || !createForm.name || (createDialog === 'part' ? !createForm.tagIds.length : !createForm.code)}>{saving ? 'Creating...' : `Create ${createDialog}`}</Button>
        </DialogActions>
      </Dialog>
      <Dialog className="tag-manager-dialog" fullWidth maxWidth="sm" open={tagManagerOpen} onClose={() => !saving && setTagManagerOpen(false)}>
        <DialogTitle>Tag management</DialogTitle>
        <DialogContent>
          <Stack className="tag-manager-content" spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography color="text.secondary">Edit existing tags or remove them from all parts.</Typography>
              <Button variant="contained" size="small" onClick={openTagDialogForCreate}>New tag</Button>
            </Stack>
            {tagManagerLoading ? <Box className="detail-loading"><CircularProgress size={28} /></Box> : tags.length ? <Stack divider={<Divider flexItem />} className="tag-manager-list">{tags.map((tag) => <Stack key={tag.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }} py={1.2}><Box><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: tag.color }} /><Typography fontWeight={700}>{tag.name}</Typography><Typography variant="caption" color="text.secondary">{tag.code}</Typography></Stack>{tag.description && <Typography variant="caption" color="text.secondary">{tag.description}</Typography>}</Box><Stack direction="row" spacing={1}><Button className="tag-action edit" variant="outlined" size="small" startIcon={<EditRoundedIcon />} onClick={() => openTagDialogForEdit(tag)}>Edit</Button><Button className="tag-action delete" variant="outlined" size="small" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => openTagDeleteImpact(tag)}>Delete</Button></Stack></Stack>)}</Stack> : <Typography color="text.secondary">No tags yet.</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setTagManagerOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" open={Boolean(tagDeleteImpact)} onClose={() => !saving && setTagDeleteImpact(null)}>
        <DialogTitle>Delete tag?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography>
              Delete <strong>{tagDeleteImpact?.name}</strong> ({tagDeleteImpact?.code})?
            </Typography>
            <Alert severity="warning">This will remove the tag from every linked part.</Alert>
            <Typography variant="body2" color="text.secondary">Affected parts: {tagDeleteImpact?.affectedCount || 0}</Typography>
            {tagDeleteImpact?.parts?.length ? <Stack divider={<Divider flexItem />} sx={{ maxHeight: 240, overflowY: 'auto', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1, p: 1 }}>{tagDeleteImpact.parts.map((part) => <Typography key={part.id} variant="body2">{part.name}{part.sku ? ` (${part.sku})` : ''}</Typography>)}</Stack> : <Typography color="text.secondary">No parts currently use this tag.</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setTagDeleteImpact(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={deleteTag} disabled={saving}>{saving ? 'Deleting...' : 'Delete tag'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="xs" open={tagDialog} onClose={() => !saving && closeTagDialog()}>
        <DialogTitle>{editingTagId ? 'Edit tag' : 'Add tag'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="caption" color="text.secondary">Short code is optional. Leave it blank to auto-generate from the tag name.</Typography>
            <TextField required label="Tag name" value={tagForm.name} onChange={(event) => { setTagForm({ ...tagForm, name: event.target.value }); if (tagFieldError) setTagFieldError(''); }} error={Boolean(tagFieldError)} helperText={tagFieldError || ''} />
            <Stack direction="row" spacing={2}><TextField fullWidth label="Short code (optional)" value={tagForm.code} onChange={(event) => { setTagForm({ ...tagForm, code: event.target.value }); if (tagFieldError) setTagFieldError(''); }} error={Boolean(tagFieldError)} helperText={tagFieldError || 'Auto-generated when empty'} /><TextField fullWidth required label="Display color" type="color" value={tagForm.color} onChange={(event) => setTagForm({ ...tagForm, color: event.target.value })} slotProps={{ htmlInput: { style: { height: 42 } } }} /></Stack>
            <TextField multiline minRows={2} label="Description" value={tagForm.description} onChange={(event) => setTagForm({ ...tagForm, description: event.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={closeTagDialog} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveTag} disabled={saving || !tagForm.name.trim() || !/^#[0-9a-f]{6}$/i.test(tagForm.color)}>{editingTagId ? 'Save tag' : 'Create tag'}</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Application settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography className="detail-label">Appearance</Typography>
            <FormControlLabel control={<Switch checked={themeMode === 'dark'} onChange={(event) => setThemeMode(event.target.checked ? 'dark' : 'light')} />} label={themeMode === 'dark' ? 'Dark mode' : 'Light mode'} />
            <TextField label="Primary accent color" type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} slotProps={{ htmlInput: { style: { height: 42 } } }} />
            <TextField label="Shop name" value={shopName} onChange={(event) => setShopName(event.target.value)} />
            <TextField label="Default operator name" value={operatorName} onChange={(event) => setOperatorName(event.target.value)} />
            <TextField label="Admin passcode" type="password" inputProps={{ inputMode: 'numeric', maxLength: 4, pattern: '[0-9]{4}' }} value={adminPasscode} onChange={(event) => setAdminPasscode(event.target.value.replace(/\D/g, '').slice(0, 4))} helperText="Use exactly four digits to unlock admin mode." />
            <Button component="label" variant="outlined">{logo ? 'Replace logo' : 'Choose logo image'}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} /></Button>
            {logo && <Box className="settings-logo-preview"><img src={logo} alt="Logo preview" /></Box>}
            <Divider />
            <Typography className="detail-label">Database connection</Typography>
            <Alert severity="info">The active connection is configured in the server environment file. Passwords are never shown in this page.</Alert>
            {configuration?.database ? <Typography variant="body2">{configuration.database.display || `${configuration.database.user}@${configuration.database.host}:${configuration.database.port} / ${configuration.database.name}`}</Typography> : <Typography color="text.secondary">Loading connection details...</Typography>}
            <Typography variant="caption" color="text.secondary">To change the database, update DATABASE_URL in the server .env file and restart the API.</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => runDatabaseMaintenance('backup')} disabled={maintenanceRunning}>{maintenanceRunning ? 'Running...' : 'Backup database'}</Button>
              <Button variant="outlined" color="warning" onClick={() => setRestoreConfirmOpen(true)} disabled={maintenanceRunning}>{maintenanceRunning ? 'Running...' : 'Restore database'}</Button>
            </Stack>
            <Typography className="detail-label">Image storage</Typography>
            <Typography variant="body2">{configuration?.imageUploadDir || 'Loading...'}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSettingsOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveSettings}>Save settings</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="xs" open={restoreConfirmOpen} onClose={() => !maintenanceRunning && setRestoreConfirmOpen(false)}>
        <DialogTitle>Restore database?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary">Upload a backup file from this computer, or restore the latest server backup.</Typography>
            {latestBackupFile && <Typography variant="body2"><strong>Latest server backup:</strong> {latestBackupFile}</Typography>}
            <Button component="label" variant="outlined">
              {restoreFile ? `Selected: ${restoreFile.name}` : 'Choose backup file'}
              <input hidden type="file" accept=".db,application/octet-stream" onChange={(event) => setRestoreFile(event.target.files?.[0] || null)} />
            </Button>
            <Alert severity="warning">Restoring overwrites the current database.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRestoreConfirmOpen(false); setRestoreFile(null); }} disabled={maintenanceRunning}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={async () => { setRestoreConfirmOpen(false); await runDatabaseMaintenance('restore', restoreFile); setRestoreFile(null); }} disabled={maintenanceRunning}>{maintenanceRunning ? 'Restoring...' : 'Restore database'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="xs" open={adminPasscodeDialog} onClose={() => setAdminPasscodeDialog(false)}>
        <DialogTitle>Unlock admin mode</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth type="password" label="Four-digit passcode" value={enteredPasscode} onChange={(event) => setEnteredPasscode(event.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(event) => event.key === 'Enter' && unlockAdminMode()} inputProps={{ inputMode: 'numeric', maxLength: 4, pattern: '[0-9]{4}' }} error={Boolean(passcodeError)} helperText={passcodeError || 'Enter the admin passcode to continue.'} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setAdminPasscodeDialog(false)}>Cancel</Button><Button variant="contained" onClick={unlockAdminMode} disabled={enteredPasscode.length !== 4}>Unlock</Button></DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3500}
        onClose={() => setNotice('')}
        message={notice}
      />
    </Box>
    </ThemeProvider>
  );
}

export default App;
