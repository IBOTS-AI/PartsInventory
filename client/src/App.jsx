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
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import ShoppingCartCheckoutRoundedIcon from '@mui/icons-material/ShoppingCartCheckoutRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import './App.css';

const movementOptions = [
  { type: 'ADD', label: 'Add stock', icon: <AddRoundedIcon /> },
  { type: 'REMOVE', label: 'Remove stock', icon: <RemoveRoundedIcon /> },
  { type: 'ADJUST', label: 'Adjust count', icon: <TuneRoundedIcon /> },
  { type: 'TRANSFER', label: 'Transfer stock', icon: <SwapHorizRoundedIcon /> },
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
  const [configuration, setConfiguration] = useState(null);
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [movement, setMovement] = useState(null);
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [selectedPart, setSelectedPart] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [labelPart, setLabelPart] = useState(null);
  const [labelLocation, setLabelLocation] = useState(null);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', target: 'both', showCategory: true, showSku: true, showManufacturerNumber: true, showLocation: true, showContents: true, showQrCode: true, accentColor: '#1d5d70' });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({ partId: 'all', locationId: 'all', type: 'all' });
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [newSupplierDialog, setNewSupplierDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [supplierForm, setSupplierForm] = useState({ supplierId: '', supplierPartNumber: '', productUrl: '', unitPrice: '', preferred: false });
  const [editPartDialog, setEditPartDialog] = useState(false);
  const [editPartForm, setEditPartForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const labelCanvas = useRef(null);
  const [createDialog, setCreateDialog] = useState(null);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', code: '', color: '#1d5d70', description: '' });
  const [createForm, setCreateForm] = useState({ name: '', sku: '', categoryId: '', unitOfMeasure: 'each', aliases: '', code: '', locationType: 'bin', parentId: '' });
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
    setSettingsOpen(false);
    setNotice('Settings saved');
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
      const [partData, categoryData, locationData, templateData, supplierData] = await Promise.all([
        getJson(`/api/parts${search ? `?search=${encodeURIComponent(search)}` : ''}`),
        getJson('/api/categories'),
        getJson('/api/locations'),
        getJson('/api/label-templates'),
        getJson('/api/suppliers'),
      ]);
      setParts(partData);
      setCategories(categoryData);
      setLocations(locationData);
      setTemplates(templateData);
      setSuppliers(supplierData);
      setSelectedTemplateId((current) => current || String(templateData[0]?.id || ''));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadInventory, 250);
    return () => clearTimeout(timer);
  }, [loadInventory]);

  const visibleParts =
    categoryId === 'all' ? parts : parts.filter((part) => part.categoryId === Number(categoryId));
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
  };

  const openPartDetails = async (part) => {
    setDetailLoading(true);
    setSelectedPart(part);
    try {
      setSelectedPart(await getJson(`/api/parts/${part.id}`));
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
      categoryId: selectedPart.categoryId,
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

  useEffect(() => {
    const labelData = labelPart || labelLocation;
    if (!labelData || !labelCanvas.current) return;
    const canvas = labelCanvas.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    const categoryColor = selectedTemplate?.accentColor || labelPart?.category.color || '#1d5d70';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 1200, 600);
    context.fillStyle = categoryColor;
    context.fillRect(0, 0, 42, 600);
    context.fillStyle = '#18242c';
    context.font = '700 58px Arial';
    context.fillText(labelPart?.name?.slice(0, 28) || labelLocation.name.slice(0, 28), 82, 118);
    context.font = '500 32px Arial';
    if (selectedTemplate?.showSku || !selectedTemplate) context.fillText(labelPart ? `SKU  ${labelPart.sku || `ID-${labelPart.id}`}` : `CODE  ${labelLocation.code}`, 82, 178);
    context.font = '500 28px Arial';
    if (selectedTemplate?.showCategory || !selectedTemplate) context.fillText(labelPart ? `${labelPart.category.name}  /  ${labelPart.unitOfMeasure}` : `${labelLocation.locationType.toUpperCase()}  /  ${labelLocation.inventory.length} PARTS`, 82, 230);
    context.fillStyle = '#68767a';
    context.font = '500 25px Arial';
    if (selectedTemplate?.showLocation || !selectedTemplate) context.fillText(labelPart ? `LOCATION  ${labelPart.homeLocation?.name || labelPart.inventory[0]?.location?.name || 'UNASSIGNED'}` : `LOCATION CODE  ${labelLocation.code}`, 82, 525);
    if (selectedTemplate?.showManufacturerNumber && labelPart?.manufacturerPartNumber) context.fillText(`MPN  ${labelPart.manufacturerPartNumber.slice(0, 30)}`, 82, 282);
    if (selectedTemplate?.showContents && !labelPart && labelLocation.inventory.length) context.fillText(`CONTENTS  ${labelLocation.inventory.slice(0, 2).map((row) => row.part.name).join(' / ')}`, 82, 282);
    if (!selectedTemplate?.showQrCode) return;
    QRCode.toDataURL(`${window.location.origin}/${labelPart ? 'parts' : 'locations'}/${labelData.qrCode}`, { margin: 1, width: 250 })
      .then((url) => {
        const image = new Image();
        image.onload = () => context.drawImage(image, 900, 170, 220, 220);
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
    if (target === 'part') setLabelPart(data);
    else setLabelLocation(data);
  };

  const openTemplateEditor = () => {
    setTemplateForm({ name: '', target: labelPart ? 'part' : 'location', showCategory: selectedTemplate?.showCategory ?? true, showSku: selectedTemplate?.showSku ?? true, showManufacturerNumber: selectedTemplate?.showManufacturerNumber ?? true, showLocation: selectedTemplate?.showLocation ?? true, showContents: selectedTemplate?.showContents ?? true, showQrCode: selectedTemplate?.showQrCode ?? true, accentColor: selectedTemplate?.accentColor || '#1d5d70' });
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
          notes: movementNote || undefined,
          operatorName: operatorName || 'Shop kiosk',
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
    setCreateForm({ name: '', sku: '', categoryId: categories[0]?.id || '', unitOfMeasure: 'each', aliases: '', code: '', locationType: 'bin', parentId: '' });
  };

  const saveCategory = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(categoryForm) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create category');
      setCategories((current) => [...current, result].sort((left, right) => left.name.localeCompare(right.name)));
      if (createDialog === 'part') setCreateForm((current) => ({ ...current, categoryId: result.id }));
      setCategoryDialog(false);
      setCategoryForm({ name: '', code: '', color: '#1d5d70', description: '' });
      setNotice('Category created');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = async () => {
    const isPart = createDialog === 'part';
    const payload = isPart
      ? { ...createForm, imageUrl: undefined, categoryId: Number(createForm.categoryId), aliases: createForm.aliases.split(',').map((alias) => alias.trim()).filter(Boolean) }
      : { name: createForm.name, code: createForm.code, locationType: createForm.locationType, parentId: createForm.parentId ? Number(createForm.parentId) : undefined };
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
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemeProvider theme={appTheme}>
    <Box className={themeMode === 'dark' ? 'app-shell theme-dark' : 'app-shell'} style={{ '--primary-accent': accentColor }}>
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
            <Button className="header-action" startIcon={<AddRoundedIcon />} onClick={() => openCreateDialog('part')}>Add part</Button>
            <Button className="header-action category-action" onClick={() => setCategoryDialog(true)}>Categories</Button>
            <Button className="header-action report-action" startIcon={<ShoppingCartCheckoutRoundedIcon />} onClick={openLowStockReport}>Needs ordering</Button>
            <Button className="header-action" startIcon={<HistoryRoundedIcon />} onClick={openHistory}>History</Button>
            <Button className="header-action location-browser-action" startIcon={<AccountTreeRoundedIcon />} onClick={() => setSelectedLocation({ browse: true })}>Locations</Button>
            <IconButton aria-label="Add location" onClick={() => openCreateDialog('location')} color="inherit"><LocationCityRoundedIcon /></IconButton>
            <IconButton aria-label="Refresh inventory" onClick={loadInventory} color="inherit">
              <RefreshRoundedIcon />
            </IconButton>
            <IconButton aria-label="Settings" onClick={openSettings} color="inherit"><SettingsRoundedIcon /></IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container className="inventory-container" maxWidth="lg">
        <Box className="page-heading">
          <Box>
            <Typography className="eyebrow">STOCKROOM / LIVE CATALOG</Typography>
            <Typography component="h1">Find a part</Typography>
            <Typography className="heading-copy">
              Search the catalog, then move stock in seconds.
            </Typography>
          </Box>
          <Box className="part-count">
            <strong>{visibleParts.length}</strong>
            <span>active parts</span>
          </Box>
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
            className="category-select"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <MenuItem value="all">All categories</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
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
            <Typography>Try another name, SKU, or category.</Typography>
          </Box>
        ) : (
          <Stack className="part-list" spacing={1.5}>
            {visibleParts.map((part) => {
              const category = part.category;
              const lowStock = Number(part.totalQuantity) <= Number(part.minimumQuantity);
              return (
                <Box className="part-row" key={part.id}>
                  <Box className="category-bar" sx={{ backgroundColor: category.color }} />
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
                        label={category.name}
                        size="small"
                        sx={{ backgroundColor: `${category.color}20`, color: category.color }}
                      />
                    </Stack>
                    <Typography className="part-meta">
                      {part.sku || `ID-${part.id}`}{' '}
                      {part.manufacturerPartNumber ? ` / ${part.manufacturerPartNumber}` : ''}
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
                          : 'No stock location'}
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
                  <Stack className="action-stack" direction="row" spacing={1}>
                    {movementOptions.map((action) => (
                      <Button
                        key={action.type}
                        className={`action-button ${action.type.toLowerCase()}`}
                        variant="outlined"
                        startIcon={action.icon}
                        onClick={() => openMovement(part, action)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Stack>
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
              (movement?.type === 'TRANSFER' && !destinationLocationId)
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
                    label={selectedPart.category.name}
                    sx={{
                      backgroundColor: `${selectedPart.category.color}20`,
                      color: selectedPart.category.color,
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
                    {selectedPart.suppliers.length ? selectedPart.suppliers.map((link) => <Stack key={link.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} py={1}><Box><Typography fontWeight={600}>{link.supplier.name} {link.preferred && <Chip label="Preferred" size="small" color="success" />}</Typography><Typography variant="caption" color="text.secondary">{link.supplierPartNumber || 'No supplier part number'}</Typography></Box><Typography fontWeight={700}>{link.unitPrice ? `$${Number(link.unitPrice).toFixed(2)}` : 'Price unknown'}</Typography></Stack>) : <Typography color="text.secondary" py={1}>No suppliers linked.</Typography>}
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
          <Button onClick={() => setSelectedPart(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="sm" open={editPartDialog} onClose={() => !saving && setEditPartDialog(false)}>
        <DialogTitle>Edit part</DialogTitle>
        <DialogContent>
          {editPartForm && <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField required label="Name" value={editPartForm.name} onChange={(event) => setEditPartForm({ ...editPartForm, name: event.target.value })} />
            <Select value={editPartForm.categoryId} onChange={(event) => setEditPartForm({ ...editPartForm, categoryId: event.target.value })}>{categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</Select>
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
      <Dialog fullWidth maxWidth="sm" open={Boolean(selectedLocation)} onClose={() => setSelectedLocation(null)}>
        <DialogTitle>{selectedLocation?.browse ? 'Storage locations' : selectedLocation?.name}</DialogTitle>
        <DialogContent>
          {selectedLocation?.browse ? (
            <Stack divider={<Divider flexItem />}>
              {locations.map((location) => <Button key={location.id} className="location-browser-row" onClick={() => openLocationDetails(location)}><Box><Typography fontWeight={700}>{location.name}</Typography><Typography variant="caption" color="text.secondary">{location.code} / {location.locationType}</Typography></Box><LocationOnRoundedIcon /></Button>)}
            </Stack>
          ) : locationLoading ? <Box className="detail-loading"><CircularProgress size={28} /></Box> : selectedLocation && <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Chip label={selectedLocation.locationType} size="small" /><Typography className="detail-sku">{selectedLocation.code}</Typography></Stack>
            <Typography color="text.secondary">{selectedLocation.parent ? `Parent: ${selectedLocation.parent.name}` : 'Top-level location'}</Typography>
            <Typography className="detail-label">Contents</Typography>
            {selectedLocation.inventory.length ? selectedLocation.inventory.map((row) => <Stack key={row.id} direction="row" sx={{ justifyContent: 'space-between' }}><Typography>{row.part.name}</Typography><Typography fontWeight={700}>{row.quantity} {row.part.unitOfMeasure}</Typography></Stack>) : <Typography color="text.secondary">No parts stored here.</Typography>}
          </Stack>}
        </DialogContent>
        <DialogActions>{selectedLocation && !selectedLocation.browse && <Button startIcon={<LocalPrintshopRoundedIcon />} onClick={() => openLabel(selectedLocation, 'location')}>Label</Button>}<Button onClick={() => setSelectedLocation(null)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="md" open={Boolean(report)} onClose={() => setReport(null)}>
        <DialogTitle>Needs ordering</DialogTitle>
        <DialogContent>
          {reportLoading ? <Box className="detail-loading"><CircularProgress size={28} /></Box> : report && <>
            <Typography color="text.secondary" sx={{ mb: 2 }}>{report.count ? `${report.count} part${report.count === 1 ? '' : 's'} at or below minimum` : 'Everything is above minimum.'}</Typography>
            <Stack divider={<Divider flexItem />}>
              {report.items.map((item) => <Stack className="report-row" key={item.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} gap={2} py={1.5}>
                <Box sx={{ minWidth: 0, flex: 1 }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Box className="report-color" sx={{ backgroundColor: item.category.color }} /><Typography fontWeight={700}>{item.name}</Typography></Stack><Typography variant="caption" color="text.secondary">{item.sku} / {item.supplier?.name || 'No preferred supplier'}</Typography></Box>
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
              {['ADD', 'REMOVE', 'ADJUST', 'TRANSFER'].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
            </Select>
            <Button variant="contained" onClick={openHistory} disabled={historyLoading}>{historyLoading ? 'Loading' : 'Filter'}</Button>
          </Stack>
          {historyLoading ? <Box className="detail-loading"><CircularProgress size={28} /></Box> : history?.length ? <Stack divider={<Divider flexItem />}>{history.map((transaction) => <Stack className="history-row" key={transaction.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }} gap={2} py={1.5}><Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={700}>{transaction.part.name}</Typography><Typography variant="caption" color="text.secondary">{transaction.type} / {transaction.location?.name || 'Unassigned'}{transaction.destination ? ` to ${transaction.destination.name}` : ''}</Typography>{transaction.notes && <Typography variant="caption" display="block" color="text.secondary">{transaction.notes}</Typography>}</Box><Typography className={Number(transaction.quantity) < 0 ? 'history-quantity negative' : 'history-quantity'}>{Number(transaction.quantity) > 0 ? '+' : ''}{transaction.quantity}</Typography><Typography className="history-date" variant="caption">{new Date(transaction.createdAt).toLocaleString()}</Typography></Stack>)}</Stack> : <Box className="empty-state"><HistoryRoundedIcon /><Typography>No inventory movements match these filters.</Typography></Box>}
        </DialogContent>
        <DialogActions><Button onClick={() => setHistory(null)}>Close</Button></DialogActions>
      </Dialog>
      <Dialog className="label-dialog" fullWidth maxWidth="md" open={Boolean(labelPart || labelLocation)} onClose={() => { setLabelPart(null); setLabelLocation(null); }}>
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
              {[['showCategory', 'Category'], ['showSku', 'SKU / code'], ['showManufacturerNumber', 'Manufacturer number'], ['showLocation', 'Location'], ['showContents', 'Contents'], ['showQrCode', 'QR code']].map(([key, label]) => <FormControlLabel key={key} control={<Checkbox checked={templateForm[key]} onChange={(event) => setTemplateForm({ ...templateForm, [key]: event.target.checked })} />} label={label} />)}
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box className="category-entry">
                  <Select fullWidth value={createForm.categoryId} onChange={(event) => setCreateForm({ ...createForm, categoryId: event.target.value })} displayEmpty>
                    <MenuItem value="" disabled>Category</MenuItem>
                    {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
                  </Select>
                  <Button size="small" onClick={() => setCategoryDialog(true)}>Manage categories</Button>
                </Box>
                <TextField className="sku-entry" fullWidth label="SKU / inventory number (optional)" value={createForm.sku} onChange={(event) => setCreateForm({ ...createForm, sku: event.target.value })} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="Unit of measure" value={createForm.unitOfMeasure} onChange={(event) => setCreateForm({ ...createForm, unitOfMeasure: event.target.value })} />
                <TextField fullWidth type="number" label="Minimum desired" value={createForm.minimumQuantity || ''} onChange={(event) => setCreateForm({ ...createForm, minimumQuantity: event.target.value })} />
              </Stack>
              <TextField label="Image URL" type="url" value={createForm.imageUrl || ''} onChange={(event) => setCreateForm({ ...createForm, imageUrl: event.target.value })} />
              <TextField label="Aliases" helperText="Separate alternate search terms with commas" value={createForm.aliases} onChange={(event) => setCreateForm({ ...createForm, aliases: event.target.value })} />
            </> : <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="Code" required value={createForm.code} onChange={(event) => setCreateForm({ ...createForm, code: event.target.value })} />
                <Select fullWidth value={createForm.locationType} onChange={(event) => setCreateForm({ ...createForm, locationType: event.target.value })}>
                  {['shop', 'shelf', 'section', 'bin', 'other'].map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                </Select>
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
          <Button variant="contained" onClick={submitCreate} disabled={saving || !createForm.name || (createDialog === 'part' ? !createForm.categoryId : !createForm.code)}>{saving ? 'Creating...' : `Create ${createDialog}`}</Button>
        </DialogActions>
      </Dialog>
      <Dialog fullWidth maxWidth="xs" open={categoryDialog} onClose={() => !saving && setCategoryDialog(false)}>
        <DialogTitle>Add category</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField required label="Category name" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} />
            <Stack direction="row" spacing={2}><TextField fullWidth required label="Short code" value={categoryForm.code} onChange={(event) => setCategoryForm({ ...categoryForm, code: event.target.value })} /><TextField fullWidth required label="Display color" type="color" value={categoryForm.color} onChange={(event) => setCategoryForm({ ...categoryForm, color: event.target.value })} slotProps={{ htmlInput: { style: { height: 42 } } }} /></Stack>
            <TextField multiline minRows={2} label="Description" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setCategoryDialog(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveCategory} disabled={saving || !categoryForm.name.trim() || !categoryForm.code.trim() || !/^#[0-9a-f]{6}$/i.test(categoryForm.color)}>Create category</Button></DialogActions>
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
            <Button component="label" variant="outlined">{logo ? 'Replace logo' : 'Choose logo image'}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} /></Button>
            {logo && <Box className="settings-logo-preview"><img src={logo} alt="Logo preview" /></Box>}
            <Divider />
            <Typography className="detail-label">Database connection</Typography>
            <Alert severity="info">The active connection is configured in the server environment file. Passwords are never shown in this page.</Alert>
            {configuration?.database ? <Typography variant="body2">{configuration.database.user}@{configuration.database.host}:{configuration.database.port} / {configuration.database.name}</Typography> : <Typography color="text.secondary">Loading connection details...</Typography>}
            <Typography variant="caption" color="text.secondary">To change the database, update DATABASE_URL in the server .env file and restart the API.</Typography>
            <Typography className="detail-label">Image storage</Typography>
            <Typography variant="body2">{configuration?.imageUploadDir || 'Loading...'}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setSettingsOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveSettings}>Save settings</Button></DialogActions>
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
