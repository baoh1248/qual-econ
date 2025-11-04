
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform, Switch } from 'react-native';
import { router } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useClientData } from '../../hooks/useClientData';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import DateInput from '../../components/DateInput';
import PricingCalculator from '../../components/PricingCalculator';
import RecurringProjectModal from '../../components/RecurringProjectModal';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';

// Predefined options for dropdowns
const PREDEFINED_LABOR = [
  'Cleaner - Entry Level',
  'Cleaner - Experienced',
  'Cleaner - Senior',
  'Supervisor',
  'Team Lead',
  'Specialist - Floor Care',
  'Specialist - Window Cleaning',
  'Specialist - Carpet Cleaning',
];

const PREDEFINED_EQUIPMENT = [
  'Vacuum Cleaner - Commercial',
  'Floor Buffer/Polisher',
  'Carpet Extractor',
  'Pressure Washer',
  'Floor Scrubber',
  'Window Cleaning Equipment',
  'Steam Cleaner',
  'Backpack Vacuum',
];

const PREDEFINED_VEHICLES = [
  'Cargo Van',
  'Box Truck',
  'Pickup Truck',
  'Company Car',
  'Utility Vehicle',
];

const PREDEFINED_SUPPLIES = [
  'All-Purpose Cleaner',
  'Glass Cleaner',
  'Disinfectant',
  'Floor Cleaner',
  'Carpet Cleaner',
  'Microfiber Cloths',
  'Mop Heads',
  'Trash Bags',
  'Paper Towels',
  'Toilet Paper',
  'Hand Soap',
  'Gloves - Latex',
  'Gloves - Nitrile',
];

interface ClientProject {
  id: string;
  client_name: string;
  building_name?: string;
  project_name: string;
  description?: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  is_included_in_contract: boolean;
  billing_amount: number;
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  client_status?: 'not-sent' | 'sent-awaiting-approval' | 'awaiting-approval-on-hold' | 'approved' | 'approved-to-be-scheduled' | 'approved-scheduled' | 'approved-on-hold' | 'declined';
  declined_reason?: string;
  next_scheduled_date?: string;
  last_completed_date?: string;
  notes?: string;
  work_order_number?: string;
  invoice_number?: string;
  estimated_price?: number;
  estimated_profitability?: number;
  is_recurring?: boolean;
  recurring_pattern_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface RecurringPattern {
  id: string;
  project_id: string;
  pattern_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  custom_days?: number;
  start_date: string;
  end_date?: string;
  max_occurrences?: number;
  is_active: boolean;
  last_generated_date?: string;
  next_occurrence_date?: string;
}

interface ProjectCompletion {
  id: string;
  project_id: string;
  completed_date: string;
  completed_by?: string;
  hours_spent: number;
  notes?: string;
  photos_count: number;
  created_at?: string;
}

interface ProjectLabor {
  id: string;
  project_id: string;
  laborer_name: string;
  skill_level: 'low' | 'medium' | 'high';
  hours_worked: number;
  hourly_rate: number;
  notes?: string;
}

interface ProjectEquipment {
  id: string;
  project_id: string;
  equipment_type: string;
  hours_used: number;
  cost_per_hour: number;
  notes?: string;
}

interface ProjectVehicle {
  id: string;
  project_id: string;
  vehicle_type: string;
  hours_used: number;
  mileage: number;
  cost_per_hour: number;
  cost_per_mile: number;
  notes?: string;
}

interface ProjectSupply {
  id: string;
  project_id: string;
  supply_type: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  notes?: string;
}

interface ProjectFormData {
  client_name: string;
  building_name: string;
  project_name: string;
  description: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  is_included_in_contract: boolean;
  billing_amount: string;
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  client_status: 'not-sent' | 'sent-awaiting-approval' | 'awaiting-approval-on-hold' | 'approved' | 'approved-to-be-scheduled' | 'approved-scheduled' | 'approved-on-hold' | 'declined';
  declined_reason: string;
  next_scheduled_date: string;
  notes: string;
  work_order_number: string;
  invoice_number: string;
  estimated_price: string;
  estimated_profitability: string;
  labor: Array<{
    laborer_name: string;
    skill_level: 'low' | 'medium' | 'high';
    hours_worked: string;
    hourly_rate: string;
    notes: string;
  }>;
  equipment: Array<{
    equipment_type: string;
    hours_used: string;
    cost_per_hour: string;
    notes: string;
  }>;
  vehicles: Array<{
    vehicle_type: string;
    hours_used: string;
    mileage: string;
    cost_per_hour: string;
    cost_per_mile: string;
    notes: string;
  }>;
  supplies: Array<{
    supply_type: string;
    quantity: string;
    unit: string;
    cost_per_unit: string;
    notes: string;
  }>;
}

const ProjectsScreen = () => {
  const { themeColor } = useTheme();
  const { showToast } = useToast();
  const { executeQuery } = useDatabase();
  const { clients, clientBuildings, cleaners } = useClientData();

  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ClientProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<Array<{id: string; name: string; category: string}>>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showPricingCalculator, setShowPricingCalculator] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ClientProject | null>(null);
  const [projectCompletions, setProjectCompletions] = useState<ProjectCompletion[]>([]);
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled' | 'on-hold'>('all');
  const [filterBilling, setFilterBilling] = useState<'all' | 'included' | 'billable'>('all');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showClientStatusDropdown, setShowClientStatusDropdown] = useState(false);

  // Resource dropdown states
  const [showLaborDropdown, setShowLaborDropdown] = useState<number | null>(null);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState<number | null>(null);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState<number | null>(null);
  const [showSupplyDropdown, setShowSupplyDropdown] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState<ProjectFormData>({
    client_name: '',
    building_name: '',
    project_name: '',
    description: '',
    frequency: 'monthly',
    is_included_in_contract: false,
    billing_amount: '0',
    status: 'active',
    client_status: 'not-sent',
    declined_reason: '',
    next_scheduled_date: '',
    notes: '',
    work_order_number: '',
    invoice_number: '',
    estimated_price: '0',
    estimated_profitability: '0',
    labor: [],
    equipment: [],
    vehicles: [],
    supplies: [],
  });

  // Completion form states
  const [completionData, setCompletionData] = useState({
    completed_by: '',
    hours_spent: '',
    notes: '',
    photos_count: '0',
  });

  // Auto-generate work order number
  const generateWorkOrderNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `WO-${year}${month}${day}-${random}`;
  }, []);

  // Auto-generate invoice number
  const generateInvoiceNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  }, []);

  // Calculate estimated price from resources
  const calculateEstimatedPrice = useCallback(() => {
    let total = 0;
    
    // Labor costs
    formData.labor.forEach(labor => {
      const hours = parseFloat(labor.hours_worked) || 0;
      const rate = parseFloat(labor.hourly_rate) || 0;
      total += hours * rate;
    });
    
    // Equipment costs
    formData.equipment.forEach(equip => {
      const hours = parseFloat(equip.hours_used) || 0;
      const rate = parseFloat(equip.cost_per_hour) || 0;
      total += hours * rate;
    });
    
    // Vehicle costs
    formData.vehicles.forEach(vehicle => {
      const hours = parseFloat(vehicle.hours_used) || 0;
      const hourRate = parseFloat(vehicle.cost_per_hour) || 0;
      const miles = parseFloat(vehicle.mileage) || 0;
      const mileRate = parseFloat(vehicle.cost_per_mile) || 0;
      total += (hours * hourRate) + (miles * mileRate);
    });
    
    // Supply costs
    formData.supplies.forEach(supply => {
      const qty = parseFloat(supply.quantity) || 0;
      const cost = parseFloat(supply.cost_per_unit) || 0;
      total += qty * cost;
    });
    
    return total.toFixed(2);
  }, [formData.labor, formData.equipment, formData.vehicles, formData.supplies]);

  // Calculate estimated profit
  const calculateEstimatedProfit = useCallback(() => {
    const price = parseFloat(calculateEstimatedPrice());
    const billing = parseFloat(formData.billing_amount) || 0;
    
    if (billing === 0) return '0.00';
    
    const profit = billing - price;
    const profitability = (profit / billing) * 100;
    
    return profitability.toFixed(2);
  }, [calculateEstimatedPrice, formData.billing_amount]);

  // Handle pricing calculator result
  const handlePriceCalculated = useCallback((totalPrice: number, selectedOption: number) => {
    console.log('Price calculated:', totalPrice, 'Option:', selectedOption);
    setFormData(prev => ({
      ...prev,
      billing_amount: totalPrice.toFixed(2),
    }));
  }, []);

  const handleRecurringPatternSave = useCallback((pattern: any) => {
    console.log('Recurring pattern saved:', pattern);
    setRecurringPattern({
      id: recurringPattern?.id || `recurring-${Date.now()}`,
      project_id: selectedProject?.id || '',
      pattern_type: pattern.type,
      interval: pattern.interval,
      days_of_week: pattern.daysOfWeek,
      day_of_month: pattern.dayOfMonth,
      custom_days: pattern.customDays,
      start_date: pattern.startDate,
      end_date: pattern.endDate,
      max_occurrences: pattern.maxOccurrences,
      is_active: true,
      next_occurrence_date: pattern.startDate,
    });
    setShowRecurringModal(false);
  }, [recurringPattern, selectedProject]);

  // Load projects and inventory from database
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading projects and inventory...');

      // Load projects
      const result = await executeQuery<ClientProject>('select', 'client_projects');
      console.log('✓ Loaded projects:', result.length);
      
      // Load inventory items for equipment and supplies
      const inventory = await executeQuery<{id: string; name: string; category: string}>('select', 'inventory_items');
      console.log('✓ Loaded inventory items:', inventory.length);
      
      setProjects(result);
      setInventoryItems(inventory);
    } catch (error) {
      console.error('Error loading projects:', error);
      showToast('Failed to load projects', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [executeQuery, showToast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    applyFilters();
  }, [projects, searchQuery, filterStatus, filterBilling]);

  const loadProjectCompletions = useCallback(async (projectId: string) => {
    try {
      console.log('Loading completions for project:', projectId);

      const result = await executeQuery<ProjectCompletion>(
        'select',
        'project_completions',
        undefined,
        { project_id: projectId }
      );
      
      console.log(`✓ Loaded ${result.length} completions`);
      setProjectCompletions(result);
    } catch (error) {
      console.error('Error loading project completions:', error);
      showToast('Failed to load project history', 'error');
    }
  }, [executeQuery, showToast]);

  const applyFilters = useCallback(() => {
    let filtered = [...projects];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.project_name.toLowerCase().includes(query) ||
          project.client_name.toLowerCase().includes(query) ||
          (project.description && project.description.toLowerCase().includes(query)) ||
          (project.work_order_number && project.work_order_number.toLowerCase().includes(query)) ||
          (project.invoice_number && project.invoice_number.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((project) => project.status === filterStatus);
    }

    // Billing filter
    if (filterBilling === 'included') {
      filtered = filtered.filter((project) => project.is_included_in_contract);
    } else if (filterBilling === 'billable') {
      filtered = filtered.filter((project) => !project.is_included_in_contract);
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, filterStatus, filterBilling]);

  const resetForm = useCallback(() => {
    setFormData({
      client_name: '',
      building_name: '',
      project_name: '',
      description: '',
      frequency: 'monthly',
      is_included_in_contract: false,
      billing_amount: '0',
      status: 'active',
      client_status: 'not-sent',
      declined_reason: '',
      next_scheduled_date: '',
      notes: '',
      work_order_number: '',
      invoice_number: '',
      estimated_price: '0',
      estimated_profitability: '0',
      labor: [],
      equipment: [],
      vehicles: [],
      supplies: [],
    });
    setShowPricingCalculator(false);
    setIsRecurring(false);
    setRecurringPattern(null);
  }, []);

  const handleAddProject = useCallback(async () => {
    try {
      if (!formData.client_name || !formData.project_name) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      console.log('Adding project...');

      const projectId = `project-${Date.now()}`;
      const recurringPatternId = isRecurring && recurringPattern ? `recurring-${Date.now()}` : undefined;
      
      const newProject: ClientProject = {
        id: projectId,
        client_name: formData.client_name,
        building_name: formData.building_name || undefined,
        project_name: formData.project_name,
        description: formData.description || undefined,
        frequency: formData.frequency,
        is_included_in_contract: formData.is_included_in_contract,
        billing_amount: parseFloat(formData.billing_amount) || 0,
        status: formData.status,
        client_status: formData.client_status,
        declined_reason: formData.client_status === 'declined' ? formData.declined_reason : undefined,
        next_scheduled_date: formData.next_scheduled_date || undefined,
        notes: formData.notes || undefined,
        work_order_number: formData.work_order_number || undefined,
        invoice_number: formData.invoice_number || undefined,
        estimated_price: parseFloat(formData.estimated_price) || 0,
        estimated_profitability: parseFloat(formData.estimated_profitability) || 0,
        is_recurring: isRecurring,
        recurring_pattern_id: recurringPatternId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await executeQuery<ClientProject>('insert', 'client_projects', newProject);

      // Save recurring pattern if enabled
      if (isRecurring && recurringPattern && recurringPatternId) {
        const recurringData = {
          id: recurringPatternId,
          project_id: projectId,
          pattern_type: recurringPattern.type,
          interval: recurringPattern.interval,
          days_of_week: recurringPattern.daysOfWeek || null,
          day_of_month: recurringPattern.dayOfMonth || null,
          custom_days: recurringPattern.customDays || null,
          start_date: recurringPattern.startDate,
          end_date: recurringPattern.endDate || null,
          max_occurrences: recurringPattern.maxOccurrences || null,
          is_active: true,
          next_occurrence_date: recurringPattern.startDate,
        };
        await executeQuery('insert', 'recurring_projects', recurringData);
        console.log('✓ Recurring pattern saved');
      }

      // Add labor entries
      for (const labor of formData.labor) {
        if (labor.laborer_name) {
          const laborEntry: ProjectLabor = {
            id: `labor-${Date.now()}-${Math.random()}`,
            project_id: projectId,
            laborer_name: labor.laborer_name,
            skill_level: labor.skill_level,
            hours_worked: parseFloat(labor.hours_worked) || 0,
            hourly_rate: parseFloat(labor.hourly_rate) || 15,
            notes: labor.notes || undefined,
          };
          await executeQuery<ProjectLabor>('insert', 'project_labor', laborEntry);
        }
      }

      // Add equipment entries
      for (const equip of formData.equipment) {
        if (equip.equipment_type) {
          const equipEntry: ProjectEquipment = {
            id: `equipment-${Date.now()}-${Math.random()}`,
            project_id: projectId,
            equipment_type: equip.equipment_type,
            hours_used: parseFloat(equip.hours_used) || 0,
            cost_per_hour: parseFloat(equip.cost_per_hour) || 0,
            notes: equip.notes || undefined,
          };
          await executeQuery<ProjectEquipment>('insert', 'project_equipment', equipEntry);
        }
      }

      // Add vehicle entries
      for (const vehicle of formData.vehicles) {
        if (vehicle.vehicle_type) {
          const vehicleEntry: ProjectVehicle = {
            id: `vehicle-${Date.now()}-${Math.random()}`,
            project_id: projectId,
            vehicle_type: vehicle.vehicle_type,
            hours_used: parseFloat(vehicle.hours_used) || 0,
            mileage: parseFloat(vehicle.mileage) || 0,
            cost_per_hour: parseFloat(vehicle.cost_per_hour) || 0,
            cost_per_mile: parseFloat(vehicle.cost_per_mile) || 0,
            notes: vehicle.notes || undefined,
          };
          await executeQuery<ProjectVehicle>('insert', 'project_vehicles', vehicleEntry);
        }
      }

      // Add supply entries
      for (const supply of formData.supplies) {
        if (supply.supply_type) {
          const supplyEntry: ProjectSupply = {
            id: `supply-${Date.now()}-${Math.random()}`,
            project_id: projectId,
            supply_type: supply.supply_type,
            quantity: parseFloat(supply.quantity) || 0,
            unit: supply.unit,
            cost_per_unit: parseFloat(supply.cost_per_unit) || 0,
            notes: supply.notes || undefined,
          };
          await executeQuery<ProjectSupply>('insert', 'project_supplies', supplyEntry);
        }
      }

      console.log('✓ Project added successfully');
      showToast(
        isRecurring 
          ? 'Recurring project created successfully' 
          : 'Project added successfully', 
        'success'
      );
      
      await loadProjects();
      
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding project:', error);
      showToast(`Failed to add project: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [formData, executeQuery, showToast, loadProjects, resetForm, isRecurring, recurringPattern]);

  const handleUpdateProject = useCallback(async () => {
    try {
      if (!selectedProject || !formData.client_name || !formData.project_name) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      console.log('Updating project...');

      const recurringPatternId = isRecurring && recurringPattern 
        ? (selectedProject.recurring_pattern_id || `recurring-${Date.now()}`)
        : undefined;

      const updatedProject = {
        client_name: formData.client_name,
        building_name: formData.building_name || undefined,
        project_name: formData.project_name,
        description: formData.description || undefined,
        frequency: formData.frequency,
        is_included_in_contract: formData.is_included_in_contract,
        billing_amount: parseFloat(formData.billing_amount) || 0,
        status: formData.status,
        client_status: formData.client_status,
        declined_reason: formData.client_status === 'declined' ? formData.declined_reason : undefined,
        next_scheduled_date: formData.next_scheduled_date || undefined,
        notes: formData.notes || undefined,
        work_order_number: formData.work_order_number || undefined,
        invoice_number: formData.invoice_number || undefined,
        estimated_price: parseFloat(formData.estimated_price) || 0,
        estimated_profitability: parseFloat(formData.estimated_profitability) || 0,
        is_recurring: isRecurring,
        recurring_pattern_id: recurringPatternId,
        updated_at: new Date().toISOString(),
      };

      await executeQuery<ClientProject>(
        'update',
        'client_projects',
        updatedProject,
        { id: selectedProject.id }
      );

      // Handle recurring pattern
      if (isRecurring && recurringPattern && recurringPatternId) {
        // Check if pattern exists
        const existingPattern = await executeQuery(
          'select',
          'recurring_projects',
          undefined,
          { id: recurringPatternId }
        );

        const recurringData = {
          id: recurringPatternId,
          project_id: selectedProject.id,
          pattern_type: recurringPattern.type,
          interval: recurringPattern.interval,
          days_of_week: recurringPattern.daysOfWeek || null,
          day_of_month: recurringPattern.dayOfMonth || null,
          custom_days: recurringPattern.customDays || null,
          start_date: recurringPattern.startDate,
          end_date: recurringPattern.endDate || null,
          max_occurrences: recurringPattern.maxOccurrences || null,
          is_active: true,
          next_occurrence_date: recurringPattern.startDate,
          updated_at: new Date().toISOString(),
        };

        if (existingPattern && existingPattern.length > 0) {
          await executeQuery('update', 'recurring_projects', recurringData, { id: recurringPatternId });
          console.log('✓ Recurring pattern updated');
        } else {
          await executeQuery('insert', 'recurring_projects', recurringData);
          console.log('✓ Recurring pattern created');
        }
      } else if (!isRecurring && selectedProject.recurring_pattern_id) {
        // Remove recurring pattern if disabled
        await executeQuery('delete', 'recurring_projects', undefined, { id: selectedProject.recurring_pattern_id });
        console.log('✓ Recurring pattern removed');
      }

      // Delete existing resources
      await executeQuery('delete', 'project_labor', undefined, { project_id: selectedProject.id });
      await executeQuery('delete', 'project_equipment', undefined, { project_id: selectedProject.id });
      await executeQuery('delete', 'project_vehicles', undefined, { project_id: selectedProject.id });
      await executeQuery('delete', 'project_supplies', undefined, { project_id: selectedProject.id });

      // Add updated labor entries
      for (const labor of formData.labor) {
        if (labor.laborer_name) {
          const laborEntry: ProjectLabor = {
            id: `labor-${Date.now()}-${Math.random()}`,
            project_id: selectedProject.id,
            laborer_name: labor.laborer_name,
            skill_level: labor.skill_level,
            hours_worked: parseFloat(labor.hours_worked) || 0,
            hourly_rate: parseFloat(labor.hourly_rate) || 15,
            notes: labor.notes || undefined,
          };
          await executeQuery<ProjectLabor>('insert', 'project_labor', laborEntry);
        }
      }

      // Add updated equipment entries
      for (const equip of formData.equipment) {
        if (equip.equipment_type) {
          const equipEntry: ProjectEquipment = {
            id: `equipment-${Date.now()}-${Math.random()}`,
            project_id: selectedProject.id,
            equipment_type: equip.equipment_type,
            hours_used: parseFloat(equip.hours_used) || 0,
            cost_per_hour: parseFloat(equip.cost_per_hour) || 0,
            notes: equip.notes || undefined,
          };
          await executeQuery<ProjectEquipment>('insert', 'project_equipment', equipEntry);
        }
      }

      // Add updated vehicle entries
      for (const vehicle of formData.vehicles) {
        if (vehicle.vehicle_type) {
          const vehicleEntry: ProjectVehicle = {
            id: `vehicle-${Date.now()}-${Math.random()}`,
            project_id: selectedProject.id,
            vehicle_type: vehicle.vehicle_type,
            hours_used: parseFloat(vehicle.hours_used) || 0,
            mileage: parseFloat(vehicle.mileage) || 0,
            cost_per_hour: parseFloat(vehicle.cost_per_hour) || 0,
            cost_per_mile: parseFloat(vehicle.cost_per_mile) || 0,
            notes: vehicle.notes || undefined,
          };
          await executeQuery<ProjectVehicle>('insert', 'project_vehicles', vehicleEntry);
        }
      }

      // Add updated supply entries
      for (const supply of formData.supplies) {
        if (supply.supply_type) {
          const supplyEntry: ProjectSupply = {
            id: `supply-${Date.now()}-${Math.random()}`,
            project_id: selectedProject.id,
            supply_type: supply.supply_type,
            quantity: parseFloat(supply.quantity) || 0,
            unit: supply.unit,
            cost_per_unit: parseFloat(supply.cost_per_unit) || 0,
            notes: supply.notes || undefined,
          };
          await executeQuery<ProjectSupply>('insert', 'project_supplies', supplyEntry);
        }
      }

      console.log('✓ Project updated successfully');
      showToast('Project updated successfully', 'success');
      
      await loadProjects();
      
      setShowEditModal(false);
      setSelectedProject(null);
      resetForm();
    } catch (error: any) {
      console.error('Error updating project:', error);
      showToast(`Failed to update project: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [selectedProject, formData, executeQuery, showToast, loadProjects, resetForm, isRecurring, recurringPattern]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting project...');
              
              // Delete related resources
              await executeQuery('delete', 'project_labor', undefined, { project_id: projectId });
              await executeQuery('delete', 'project_equipment', undefined, { project_id: projectId });
              await executeQuery('delete', 'project_vehicles', undefined, { project_id: projectId });
              await executeQuery('delete', 'project_supplies', undefined, { project_id: projectId });
              await executeQuery('delete', 'project_completions', undefined, { project_id: projectId });
              
              await executeQuery<ClientProject>(
                'delete',
                'client_projects',
                undefined,
                { id: projectId }
              );
              
              console.log('✓ Project deleted successfully');
              
              showToast('Project deleted successfully', 'success');
              setShowDetailsModal(false);
              setSelectedProject(null);
              
              await loadProjects();
            } catch (error: any) {
              console.error('Error deleting project:', error);
              showToast(`Failed to delete project: ${error?.message || 'Unknown error'}`, 'error');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [executeQuery, showToast, loadProjects]);

  const handleMarkComplete = useCallback(async () => {
    try {
      if (!selectedProject) return;

      const completionId = `completion-${Date.now()}`;
      const completedDate = new Date().toISOString().split('T')[0];

      console.log('Marking project complete...');

      const newCompletion: ProjectCompletion = {
        id: completionId,
        project_id: selectedProject.id,
        completed_date: completedDate,
        completed_by: completionData.completed_by || undefined,
        hours_spent: parseFloat(completionData.hours_spent) || 0,
        notes: completionData.notes || undefined,
        photos_count: parseInt(completionData.photos_count) || 0,
        created_at: new Date().toISOString(),
      };

      await executeQuery<ProjectCompletion>('insert', 'project_completions', newCompletion);

      await executeQuery<ClientProject>(
        'update',
        'client_projects',
        { 
          last_completed_date: completedDate,
          updated_at: new Date().toISOString()
        },
        { id: selectedProject.id }
      );

      console.log('✓ Project marked as complete');
      showToast('Project marked as complete', 'success');
      
      await loadProjects();
      
      setShowCompletionModal(false);
      setCompletionData({
        completed_by: '',
        hours_spent: '',
        notes: '',
        photos_count: '0',
      });
    } catch (error: any) {
      console.error('Error marking project complete:', error);
      showToast(`Failed to mark project complete: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [selectedProject, completionData, executeQuery, showToast, loadProjects]);

  const openEditModal = useCallback(async (project: ClientProject) => {
    console.log('Opening edit modal for project:', project.id);
    setSelectedProject(project);
    
    // Load resources
    try {
      const laborData = await executeQuery<ProjectLabor>('select', 'project_labor', undefined, { project_id: project.id });
      const equipmentData = await executeQuery<ProjectEquipment>('select', 'project_equipment', undefined, { project_id: project.id });
      const vehicleData = await executeQuery<ProjectVehicle>('select', 'project_vehicles', undefined, { project_id: project.id });
      const supplyData = await executeQuery<ProjectSupply>('select', 'project_supplies', undefined, { project_id: project.id });
      
      // Load recurring pattern if exists
      setIsRecurring(project.is_recurring || false);
      if (project.is_recurring && project.recurring_pattern_id) {
        const patternData = await executeQuery<RecurringPattern>(
          'select',
          'recurring_projects',
          undefined,
          { id: project.recurring_pattern_id }
        );
        if (patternData && patternData.length > 0) {
          setRecurringPattern(patternData[0]);
          console.log('✓ Loaded recurring pattern');
        }
      } else {
        setRecurringPattern(null);
      }
      
      setFormData({
        client_name: project.client_name,
        building_name: project.building_name || '',
        project_name: project.project_name,
        description: project.description || '',
        frequency: project.frequency,
        is_included_in_contract: project.is_included_in_contract,
        billing_amount: project.billing_amount.toString(),
        status: project.status,
        client_status: project.client_status || 'not-sent',
        declined_reason: project.declined_reason || '',
        next_scheduled_date: project.next_scheduled_date || '',
        notes: project.notes || '',
        work_order_number: project.work_order_number || '',
        invoice_number: project.invoice_number || '',
        estimated_price: (project.estimated_price || 0).toString(),
        estimated_profitability: (project.estimated_profitability || 0).toString(),
        labor: laborData.map(l => ({
          laborer_name: l.laborer_name,
          skill_level: l.skill_level,
          hours_worked: l.hours_worked.toString(),
          hourly_rate: l.hourly_rate.toString(),
          notes: l.notes || '',
        })),
        equipment: equipmentData.map(e => ({
          equipment_type: e.equipment_type,
          hours_used: e.hours_used.toString(),
          cost_per_hour: e.cost_per_hour.toString(),
          notes: e.notes || '',
        })),
        vehicles: vehicleData.map(v => ({
          vehicle_type: v.vehicle_type,
          hours_used: v.hours_used.toString(),
          mileage: v.mileage.toString(),
          cost_per_hour: v.cost_per_hour.toString(),
          cost_per_mile: v.cost_per_mile.toString(),
          notes: v.notes || '',
        })),
        supplies: supplyData.map(s => ({
          supply_type: s.supply_type,
          quantity: s.quantity.toString(),
          unit: s.unit,
          cost_per_unit: s.cost_per_unit.toString(),
          notes: s.notes || '',
        })),
      });
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading project resources:', error);
      showToast('Failed to load project resources', 'error');
    }
  }, [executeQuery, showToast]);

  const openDetailsModal = useCallback(async (project: ClientProject) => {
    console.log('Opening details modal for project:', project.id);
    setSelectedProject(project);
    loadProjectCompletions(project.id);
    
    // Load recurring pattern if exists
    if (project.is_recurring && project.recurring_pattern_id) {
      try {
        const patternData = await executeQuery<RecurringPattern>(
          'select',
          'recurring_projects',
          undefined,
          { id: project.recurring_pattern_id }
        );
        if (patternData && patternData.length > 0) {
          setRecurringPattern(patternData[0]);
          console.log('✓ Loaded recurring pattern for details');
        }
      } catch (error) {
        console.error('Error loading recurring pattern:', error);
      }
    } else {
      setRecurringPattern(null);
    }
    
    setShowDetailsModal(true);
  }, [loadProjectCompletions, executeQuery]);

  const openCompletionModal = useCallback((project: ClientProject) => {
    console.log('Opening completion modal for project:', project.id);
    setSelectedProject(project);
    setShowCompletionModal(true);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'completed':
        return themeColor;
      case 'cancelled':
        return colors.danger;
      case 'on-hold':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getClientStatusLabel = (status?: string) => {
    if (!status) return 'Not Sent';
    switch (status) {
      case 'not-sent':
        return 'Not Sent';
      case 'sent-awaiting-approval':
        return 'Sent, awaiting approval';
      case 'awaiting-approval-on-hold':
        return 'Awaiting Approval On Hold';
      case 'approved':
        return 'Approved';
      case 'approved-to-be-scheduled':
        return 'Approved to be Scheduled';
      case 'approved-scheduled':
        return 'Approved Scheduled';
      case 'approved-on-hold':
        return 'Approved On Hold';
      case 'declined':
        return 'Declined';
      default:
        return status;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'one-time':
        return 'One Time';
      case 'weekly':
        return 'Weekly';
      case 'bi-weekly':
        return 'Bi-Weekly';
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      default:
        return frequency;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getRecurringPatternDescription = (pattern: RecurringPattern) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let description = '';

    switch (pattern.pattern_type) {
      case 'daily':
        description = pattern.interval === 1 ? 'Every day' : `Every ${pattern.interval} days`;
        break;
      case 'weekly':
        const dayNames = pattern.days_of_week
          ?.map(d => daysOfWeek[d])
          .join(', ') || '';
        description =
          pattern.interval === 1
            ? `Every week on ${dayNames}`
            : `Every ${pattern.interval} weeks on ${dayNames}`;
        break;
      case 'monthly':
        description =
          pattern.interval === 1
            ? `Every month on day ${pattern.day_of_month}`
            : `Every ${pattern.interval} months on day ${pattern.day_of_month}`;
        break;
      case 'custom':
        description = pattern.custom_days === 1 ? 'Every day' : `Every ${pattern.custom_days} days`;
        break;
    }

    if (pattern.start_date) {
      description += `, starting ${formatDate(pattern.start_date)}`;
    }

    if (pattern.end_date) {
      description += `, until ${formatDate(pattern.end_date)}`;
    } else if (pattern.max_occurrences) {
      description += `, for ${pattern.max_occurrences} occurrence${pattern.max_occurrences !== 1 ? 's' : ''}`;
    }

    return description;
  };

  // Get buildings for selected client
  const getClientBuildings = useCallback(() => {
    if (!formData.client_name) return [];
    return clientBuildings.filter(b => b.clientName === formData.client_name);
  }, [formData.client_name, clientBuildings]);

  // Add/remove resource functions
  const addLabor = () => {
    setFormData({
      ...formData,
      labor: [...formData.labor, { laborer_name: '', skill_level: 'medium', hours_worked: '0', hourly_rate: '15', notes: '' }]
    });
  };

  const removeLabor = (index: number) => {
    setFormData({
      ...formData,
      labor: formData.labor.filter((_, i) => i !== index)
    });
  };

  const addEquipment = () => {
    setFormData({
      ...formData,
      equipment: [...formData.equipment, { equipment_type: '', hours_used: '0', cost_per_hour: '0', notes: '' }]
    });
  };

  const removeEquipment = (index: number) => {
    setFormData({
      ...formData,
      equipment: formData.equipment.filter((_, i) => i !== index)
    });
  };

  const addVehicle = () => {
    setFormData({
      ...formData,
      vehicles: [...formData.vehicles, { vehicle_type: '', hours_used: '0', mileage: '0', cost_per_hour: '0', cost_per_mile: '0', notes: '' }]
    });
  };

  const removeVehicle = (index: number) => {
    setFormData({
      ...formData,
      vehicles: formData.vehicles.filter((_, i) => i !== index)
    });
  };

  const addSupply = () => {
    setFormData({
      ...formData,
      supplies: [...formData.supplies, { supply_type: '', quantity: '0', unit: '', cost_per_unit: '0', notes: '' }]
    });
  };

  const removeSupply = (index: number) => {
    setFormData({
      ...formData,
      supplies: formData.supplies.filter((_, i) => i !== index)
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading projects..." />;
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: themeColor,
    },
    filtersContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    searchIcon: {
      color: colors.textSecondary,
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.sm,
      fontSize: 16,
      color: colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      backgroundColor: colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: themeColor,
      borderColor: themeColor,
    },
    filterChipText: {
      ...typography.small,
      color: colors.text,
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: colors.background,
      fontWeight: '600',
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 8,
      padding: spacing.md,
      alignItems: 'center',
    },
    statValue: {
      ...typography.h2,
      color: themeColor,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    statLabel: {
      ...typography.small,
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyStateText: {
      ...typography.h3,
      color: colors.textSecondary,
      marginVertical: spacing.lg,
    },
    projectCard: {
      marginBottom: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    projectHeader: {
      marginBottom: spacing.sm,
    },
    projectTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    projectName: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
      flex: 1,
    },
    clientName: {
      ...typography.body,
      color: colors.textSecondary,
    },
    projectDescription: {
      ...typography.body,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    projectDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    detailText: {
      ...typography.small,
      color: colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    statusText: {
      ...typography.small,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    projectActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    actionButtonText: {
      ...typography.small,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '85%',
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: spacing.lg,
      ...commonStyles.shadow,
    },
    modalTitle: {
      ...typography.h2,
      color: colors.text,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    modalSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    inputLabel: {
      ...typography.body,
      color: colors.text,
      fontWeight: '500',
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    inputTouchable: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
    },
    inputText: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    placeholderText: {
      color: colors.textSecondary,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    dropdown: {
      maxHeight: 200,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.background,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    dropdownScroll: {
      maxHeight: 200,
    },
    dropdownItem: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownText: {
      ...typography.body,
      color: colors.text,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      marginTop: spacing.sm,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    modalButton: {
      flex: 1,
    },
    detailsSection: {
      marginBottom: spacing.lg,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailLabel: {
      ...typography.body,
      color: colors.textSecondary,
      fontWeight: '500',
      flex: 1,
    },
    detailValue: {
      ...typography.body,
      color: colors.text,
      flex: 2,
      textAlign: 'right',
    },
    historySection: {
      marginBottom: spacing.lg,
    },
    historyItem: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    historyDate: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
    },
    historyBy: {
      ...typography.small,
      color: colors.textSecondary,
    },
    historyDetail: {
      ...typography.small,
      color: colors.textSecondary,
      marginTop: 2,
    },
    historyNotes: {
      ...typography.small,
      color: colors.text,
      marginTop: spacing.xs,
      fontStyle: 'italic',
    },
    numberInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    numberInputContainer: {
      flex: 1,
    },
    generateButton: {
      backgroundColor: themeColor,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    generateButtonText: {
      ...typography.small,
      color: colors.background,
      fontWeight: '600',
    },
    sectionHeader: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    resourceCard: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resourceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    resourceTitle: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: themeColor,
      borderRadius: 6,
    },
    addButtonText: {
      ...typography.small,
      color: colors.background,
      fontWeight: '600',
    },
    removeButton: {
      padding: spacing.xs,
    },
    calculatedField: {
      backgroundColor: colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    calculatedValue: {
      ...typography.body,
      color: themeColor,
      fontWeight: '600',
    },
    inputWithDropdown: {
      position: 'relative',
    },
    dropdownToggle: {
      position: 'absolute',
      right: spacing.sm,
      top: '50%',
      transform: [{ translateY: -12 }],
    },
    calculatorToggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: themeColor + '15',
      borderRadius: 8,
      borderWidth: 2,
      borderColor: themeColor,
      marginVertical: spacing.md,
    },
    calculatorToggleText: {
      ...typography.body,
      color: themeColor,
      fontWeight: '600',
    },
    patternSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColor + '10',
      padding: spacing.md,
      borderRadius: 8,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    patternSummaryText: {
      ...typography.body,
      color: colors.text,
      marginLeft: spacing.sm,
      fontWeight: '500',
      flex: 1,
    },
  });

  // Get available buildings for the selected client
  const availableBuildings = getClientBuildings();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Client Projects</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            console.log('Add button pressed');
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Icon name="add" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects, WO#, INV#..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus !== 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus(filterStatus === 'all' ? 'active' : 'all')}
          >
            <Text style={[styles.filterChipText, filterStatus !== 'all' && styles.filterChipTextActive]}>
              {filterStatus === 'all' ? 'All Status' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterBilling !== 'all' && styles.filterChipActive]}
            onPress={() => {
              if (filterBilling === 'all') setFilterBilling('included');
              else if (filterBilling === 'included') setFilterBilling('billable');
              else setFilterBilling('all');
            }}
          >
            <Text style={[styles.filterChipText, filterBilling !== 'all' && styles.filterChipTextActive]}>
              {filterBilling === 'all' ? 'All Projects' : filterBilling === 'included' ? 'Included' : 'Billable'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{projects.filter((p) => p.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{projects.filter((p) => p.is_included_in_contract).length}</Text>
          <Text style={styles.statLabel}>Included</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{projects.filter((p) => !p.is_included_in_contract).length}</Text>
          <Text style={styles.statLabel}>Billable</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            ${projects.filter((p) => !p.is_included_in_contract).reduce((sum, p) => sum + p.billing_amount, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Projects List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredProjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="folder-open-outline" size={64} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>No projects found</Text>
            <Button 
              text="Add Project" 
              onPress={() => {
                console.log('Add Project button pressed');
                resetForm();
                setShowAddModal(true);
              }} 
              variant="primary" 
            />
          </View>
        ) : (
          filteredProjects.map((project) => (
            <AnimatedCard key={project.id} style={styles.projectCard}>
              <TouchableOpacity onPress={() => openDetailsModal(project)} activeOpacity={0.7}>
                <View style={styles.projectHeader}>
                  <View style={styles.projectTitleRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      {project.is_recurring && (
                        <Icon name="repeat" size={20} style={{ color: themeColor }} />
                      )}
                      <Text style={[styles.projectName, { flex: 1 }]}>{project.project_name}</Text>
                    </View>
                    <View
                      style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) + '20' }]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                        {project.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.clientName}>
                    {project.client_name}
                    {project.building_name && ` • ${project.building_name}`}
                  </Text>
                </View>

                {project.description && (
                  <Text style={styles.projectDescription} numberOfLines={2}>
                    {project.description}
                  </Text>
                )}

                <View style={styles.projectDetails}>
                  {project.work_order_number && (
                    <View style={styles.detailItem}>
                      <Icon name="document-text" size={16} style={{ color: themeColor }} />
                      <Text style={styles.detailText}>WO: {project.work_order_number}</Text>
                    </View>
                  )}

                  {project.invoice_number && (
                    <View style={styles.detailItem}>
                      <Icon name="receipt" size={16} style={{ color: colors.warning }} />
                      <Text style={styles.detailText}>INV: {project.invoice_number}</Text>
                    </View>
                  )}

                  <View style={styles.detailItem}>
                    <Icon name="repeat" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>{getFrequencyLabel(project.frequency)}</Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Icon
                      name={project.is_included_in_contract ? 'checkmark-circle' : 'cash'}
                      size={16}
                      style={{
                        color: project.is_included_in_contract ? colors.success : colors.warning,
                      }}
                    />
                    <Text style={styles.detailText}>
                      {project.is_included_in_contract ? 'Included' : `$${project.billing_amount.toFixed(2)}`}
                    </Text>
                  </View>
                  
                  {project.next_scheduled_date && (
                    <View style={styles.detailItem}>
                      <Icon name="calendar" size={16} style={{ color: themeColor }} />
                      <Text style={styles.detailText}>{formatDate(project.next_scheduled_date)}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.projectActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    console.log('Complete button pressed for project:', project.id);
                    openCompletionModal(project);
                  }}
                >
                  <Icon name="checkmark-done" size={20} style={{ color: colors.success }} />
                  <Text style={[styles.actionButtonText, { color: colors.success }]}>Complete</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={(e) => {
                    e.stopPropagation();
                    console.log('Edit button pressed for project:', project.id);
                    openEditModal(project);
                  }}
                >
                  <Icon name="create" size={20} style={{ color: colors.warning }} />
                  <Text style={[styles.actionButtonText, { color: colors.warning }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={(e) => {
                    e.stopPropagation();
                    console.log('Details button pressed for project:', project.id);
                    openDetailsModal(project);
                  }}
                >
                  <Icon name="information-circle" size={20} style={{ color: themeColor }} />
                  <Text style={[styles.actionButtonText, { color: themeColor }]}>Details</Text>
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {showAddModal ? 'Add Project' : 'Edit Project'}
            </Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Pricing Calculator Toggle */}
              <TouchableOpacity
                style={styles.calculatorToggleButton}
                onPress={() => setShowPricingCalculator(!showPricingCalculator)}
              >
                <Icon 
                  name={showPricingCalculator ? 'calculator' : 'calculator-outline'} 
                  size={24} 
                  style={{ color: themeColor }} 
                />
                <Text style={styles.calculatorToggleText}>
                  {showPricingCalculator ? 'Hide Pricing Calculator' : 'Show Pricing Calculator'}
                </Text>
                <Icon 
                  name={showPricingCalculator ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  style={{ color: themeColor }} 
                />
              </TouchableOpacity>

              {/* Pricing Calculator */}
              {showPricingCalculator && (
                <PricingCalculator 
                  themeColor={themeColor} 
                  onPriceCalculated={handlePriceCalculated}
                />
              )}

              {/* Basic Information */}
              <Text style={styles.inputLabel}>Client Name *</Text>
              <TouchableOpacity
                style={styles.inputTouchable}
                onPress={() => setShowClientDropdown(!showClientDropdown)}
              >
                <Text style={[styles.inputText, !formData.client_name && styles.placeholderText]}>
                  {formData.client_name || 'Select client'}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showClientDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                    {clients.map((client) => (
                      <TouchableOpacity
                        key={client.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, client_name: client.name, building_name: '' });
                          setShowClientDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{client.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Building Name</Text>
              <TouchableOpacity
                style={styles.inputTouchable}
                onPress={() => {
                  if (formData.client_name && availableBuildings.length > 0) {
                    setShowBuildingDropdown(!showBuildingDropdown);
                  }
                }}
                disabled={!formData.client_name || availableBuildings.length === 0}
              >
                <Text style={[styles.inputText, !formData.building_name && styles.placeholderText]}>
                  {formData.building_name || (formData.client_name ? (availableBuildings.length > 0 ? 'Select building (optional)' : 'No buildings available') : 'Select client first')}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showBuildingDropdown && availableBuildings.length > 0 && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData({ ...formData, building_name: '' });
                        setShowBuildingDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownText, { fontStyle: 'italic' }]}>None</Text>
                    </TouchableOpacity>
                    {availableBuildings.map((building) => (
                      <TouchableOpacity
                        key={building.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, building_name: building.name });
                          setShowBuildingDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{building.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Project Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.project_name}
                onChangeText={(text) => setFormData({ ...formData, project_name: text })}
                placeholder="Enter project name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter description"
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <Text style={styles.inputLabel}>Frequency</Text>
              <TouchableOpacity
                style={styles.inputTouchable}
                onPress={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
              >
                <Text style={styles.inputText}>{getFrequencyLabel(formData.frequency)}</Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showFrequencyDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                    {['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'].map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, frequency: freq as any });
                          setShowFrequencyDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{getFrequencyLabel(freq)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Status</Text>
              <TouchableOpacity
                style={styles.inputTouchable}
                onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              >
                <Text style={styles.inputText}>{formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}</Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showStatusDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                    {['active', 'completed', 'cancelled', 'on-hold'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, status: status as any });
                          setShowStatusDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Client Status</Text>
              <TouchableOpacity
                style={styles.inputTouchable}
                onPress={() => setShowClientStatusDropdown(!showClientStatusDropdown)}
              >
                <Text style={styles.inputText}>{getClientStatusLabel(formData.client_status)}</Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showClientStatusDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                    {['not-sent', 'sent-awaiting-approval', 'awaiting-approval-on-hold', 'approved', 'approved-to-be-scheduled', 'approved-scheduled', 'approved-on-hold', 'declined'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, client_status: status as any });
                          setShowClientStatusDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{getClientStatusLabel(status)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {formData.client_status === 'declined' && (
                <>
                  <Text style={styles.inputLabel}>Declined Reason</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.declined_reason}
                    onChangeText={(text) => setFormData({ ...formData, declined_reason: text })}
                    placeholder="Enter reason for decline"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Included in Contract</Text>
                <Switch
                  value={formData.is_included_in_contract}
                  onValueChange={(value) => setFormData({ ...formData, is_included_in_contract: value })}
                  trackColor={{ false: colors.border, true: themeColor }}
                  thumbColor={colors.background}
                />
              </View>

              <Text style={styles.inputLabel}>Billing Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={formData.billing_amount}
                onChangeText={(text) => setFormData({ ...formData, billing_amount: text })}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <DateInput
                label="Next Scheduled Date"
                value={formData.next_scheduled_date}
                onChangeText={(text) => setFormData({ ...formData, next_scheduled_date: text })}
                placeholder="YYYY-MM-DD"
                themeColor={themeColor}
              />

              <Text style={styles.inputLabel}>Work Order Number</Text>
              <View style={styles.numberInputRow}>
                <View style={styles.numberInputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.work_order_number}
                    onChangeText={(text) => setFormData({ ...formData, work_order_number: text })}
                    placeholder="WO-YYYYMMDD-XXX"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={() => setFormData({ ...formData, work_order_number: generateWorkOrderNumber() })}
                >
                  <Icon name="refresh" size={16} style={{ color: colors.background }} />
                  <Text style={styles.generateButtonText}>Generate</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Invoice Number</Text>
              <View style={styles.numberInputRow}>
                <View style={styles.numberInputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.invoice_number}
                    onChangeText={(text) => setFormData({ ...formData, invoice_number: text })}
                    placeholder="INV-YYYYMM-XXXX"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={() => setFormData({ ...formData, invoice_number: generateInvoiceNumber() })}
                >
                  <Icon name="refresh" size={16} style={{ color: colors.background }} />
                  <Text style={styles.generateButtonText}>Generate</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Enter notes"
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              {/* Recurring Project Option */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Make this a recurring project</Text>
                  <Text style={[styles.inputLabel, { fontSize: 12, color: colors.textSecondary, fontWeight: '400' }]}>
                    Automatically schedule this project on a repeating basis
                  </Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={(value) => {
                    setIsRecurring(value);
                    if (value && !recurringPattern) {
                      setShowRecurringModal(true);
                    }
                  }}
                  trackColor={{ false: colors.border, true: themeColor }}
                  thumbColor={colors.background}
                />
              </View>

              {isRecurring && (
                <TouchableOpacity
                  style={[styles.calculatorToggleButton, { borderColor: themeColor, backgroundColor: themeColor + '15' }]}
                  onPress={() => setShowRecurringModal(true)}
                >
                  <Icon name="calendar" size={24} style={{ color: themeColor }} />
                  <Text style={[styles.calculatorToggleText, { color: themeColor }]}>
                    {recurringPattern ? 'Edit Recurring Pattern' : 'Set Recurring Pattern'}
                  </Text>
                  <Icon name="chevron-forward" size={20} style={{ color: themeColor }} />
                </TouchableOpacity>
              )}

              {isRecurring && recurringPattern && (
                <View style={[styles.patternSummary, { backgroundColor: themeColor + '10' }]}>
                  <Icon name="information-circle" size={20} style={{ color: themeColor }} />
                  <Text style={styles.patternSummaryText}>
                    {getRecurringPatternDescription(recurringPattern)}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                text="Cancel"
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                text={showAddModal ? 'Add' : 'Update'}
                onPress={() => {
                  // Update calculated fields before saving
                  const updatedFormData = {
                    ...formData,
                    estimated_price: calculateEstimatedPrice(),
                    estimated_profitability: calculateEstimatedProfit(),
                  };
                  setFormData(updatedFormData);
                  
                  if (showAddModal) {
                    handleAddProject();
                  } else {
                    handleUpdateProject();
                  }
                }}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Project Details</Text>
            
            {selectedProject && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Project:</Text>
                    <Text style={styles.detailValue}>{selectedProject.project_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Client:</Text>
                    <Text style={styles.detailValue}>{selectedProject.client_name}</Text>
                  </View>
                  {selectedProject.building_name && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Building:</Text>
                      <Text style={styles.detailValue}>{selectedProject.building_name}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor(selectedProject.status) }]}>
                      {selectedProject.status}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Client Status:</Text>
                    <Text style={styles.detailValue}>
                      {getClientStatusLabel(selectedProject.client_status)}
                    </Text>
                  </View>
                  {selectedProject.client_status === 'declined' && selectedProject.declined_reason && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Declined Reason:</Text>
                      <Text style={styles.detailValue}>{selectedProject.declined_reason}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Frequency:</Text>
                    <Text style={styles.detailValue}>{getFrequencyLabel(selectedProject.frequency)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Billing:</Text>
                    <Text style={styles.detailValue}>
                      {selectedProject.is_included_in_contract ? 'Included in Contract' : `$${selectedProject.billing_amount.toFixed(2)}`}
                    </Text>
                  </View>
                  {selectedProject.estimated_price !== undefined && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Estimated Cost:</Text>
                      <Text style={styles.detailValue}>${selectedProject.estimated_price.toFixed(2)}</Text>
                    </View>
                  )}
                  {selectedProject.estimated_profitability !== undefined && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Profit Margin:</Text>
                      <Text style={[styles.detailValue, { color: selectedProject.estimated_profitability > 0 ? colors.success : colors.danger }]}>
                        {selectedProject.estimated_profitability.toFixed(2)}%
                      </Text>
                    </View>
                  )}
                  {selectedProject.work_order_number && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Work Order:</Text>
                      <Text style={styles.detailValue}>{selectedProject.work_order_number}</Text>
                    </View>
                  )}
                  {selectedProject.invoice_number && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Invoice:</Text>
                      <Text style={styles.detailValue}>{selectedProject.invoice_number}</Text>
                    </View>
                  )}
                  {selectedProject.next_scheduled_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Next Scheduled:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedProject.next_scheduled_date)}</Text>
                    </View>
                  )}
                  {selectedProject.last_completed_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Last Completed:</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedProject.last_completed_date)}</Text>
                    </View>
                  )}
                  {selectedProject.description && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Description:</Text>
                      <Text style={styles.detailValue}>{selectedProject.description}</Text>
                    </View>
                  )}
                  {selectedProject.notes && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <Text style={styles.detailValue}>{selectedProject.notes}</Text>
                    </View>
                  )}
                  {selectedProject.is_recurring && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Recurring:</Text>
                      <Text style={[styles.detailValue, { color: themeColor, fontWeight: '600' }]}>Yes</Text>
                    </View>
                  )}
                </View>

                {selectedProject.is_recurring && recurringPattern && (
                  <View style={styles.detailsSection}>
                    <Text style={styles.inputLabel}>Recurring Pattern</Text>
                    <View style={[styles.patternSummary, { backgroundColor: themeColor + '10' }]}>
                      <Icon name="repeat" size={20} style={{ color: themeColor }} />
                      <Text style={styles.patternSummaryText}>
                        {getRecurringPatternDescription(recurringPattern)}
                      </Text>
                    </View>
                  </View>
                )}

                {projectCompletions.length > 0 && (
                  <View style={styles.historySection}>
                    <Text style={styles.inputLabel}>Completion History</Text>
                    {projectCompletions.map((completion) => (
                      <View key={completion.id} style={styles.historyItem}>
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyDate}>{formatDate(completion.completed_date)}</Text>
                          {completion.completed_by && (
                            <Text style={styles.historyBy}>by {completion.completed_by}</Text>
                          )}
                        </View>
                        <Text style={styles.historyDetail}>
                          {completion.hours_spent}h • {completion.photos_count} photos
                        </Text>
                        {completion.notes && (
                          <Text style={styles.historyNotes}>{completion.notes}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Button
                text="Delete"
                onPress={() => selectedProject && handleDeleteProject(selectedProject.id)}
                variant="danger"
                style={styles.modalButton}
              />
              <Button
                text="Close"
                onPress={() => setShowDetailsModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal
        visible={showCompletionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Mark Project Complete</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Completed By</Text>
              <TextInput
                style={styles.input}
                value={completionData.completed_by}
                onChangeText={(text) => setCompletionData({ ...completionData, completed_by: text })}
                placeholder="Enter name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Hours Spent</Text>
              <TextInput
                style={styles.input}
                value={completionData.hours_spent}
                onChangeText={(text) => setCompletionData({ ...completionData, hours_spent: text })}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Photos Count</Text>
              <TextInput
                style={styles.input}
                value={completionData.photos_count}
                onChangeText={(text) => setCompletionData({ ...completionData, photos_count: text })}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={completionData.notes}
                onChangeText={(text) => setCompletionData({ ...completionData, notes: text })}
                placeholder="Enter completion notes"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                text="Cancel"
                onPress={() => setShowCompletionModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                text="Mark Complete"
                onPress={handleMarkComplete}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Recurring Project Modal */}
      <RecurringProjectModal
        visible={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        onSave={handleRecurringPatternSave}
        themeColor={themeColor}
        initialPattern={recurringPattern ? {
          type: recurringPattern.pattern_type,
          interval: recurringPattern.interval,
          daysOfWeek: recurringPattern.days_of_week || undefined,
          dayOfMonth: recurringPattern.day_of_month || undefined,
          customDays: recurringPattern.custom_days || undefined,
          startDate: recurringPattern.start_date,
          endDate: recurringPattern.end_date || undefined,
          maxOccurrences: recurringPattern.max_occurrences || undefined,
        } : undefined}
      />

      <Toast />
    </View>
  );
};

export default ProjectsScreen;
