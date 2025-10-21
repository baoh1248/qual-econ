
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
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';

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
  next_scheduled_date?: string;
  last_completed_date?: string;
  notes?: string;
  work_order_number?: string;
  invoice_number?: string;
  created_at?: string;
  updated_at?: string;
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

interface ProjectFormData {
  client_name: string;
  building_name: string;
  project_name: string;
  description: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  is_included_in_contract: boolean;
  billing_amount: string;
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  next_scheduled_date: string;
  notes: string;
  work_order_number: string;
  invoice_number: string;
}

const ProjectsScreen = () => {
  const { themeColor } = useTheme();
  const { showToast } = useToast();
  const { executeQuery } = useDatabase();
  const { clients, clientBuildings, cleaners } = useClientData();

  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ClientProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ClientProject | null>(null);
  const [projectCompletions, setProjectCompletions] = useState<ProjectCompletion[]>([]);

  // Resource allocation states for selected project (details view)
  const [projectLabor, setProjectLabor] = useState<ProjectLabor[]>([]);
  const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
  const [projectVehicles, setProjectVehicles] = useState<ProjectVehicle[]>([]);
  const [projectSupplies, setProjectSupplies] = useState<ProjectSupply[]>([]);

  // Calculated values for selected project
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedProfit, setEstimatedProfit] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled' | 'on-hold'>('all');
  const [filterBilling, setFilterBilling] = useState<'all' | 'included' | 'billable'>('all');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

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
    next_scheduled_date: '',
    notes: '',
    work_order_number: '',
    invoice_number: '',
  });

  // Completion form states
  const [completionData, setCompletionData] = useState({
    completed_by: '',
    hours_spent: '',
    notes: '',
    photos_count: '0',
  });

  // Resource form states for Add/Edit modals
  const [laborList, setLaborList] = useState<Omit<ProjectLabor, 'id' | 'project_id'>[]>([]);
  const [equipmentList, setEquipmentList] = useState<Omit<ProjectEquipment, 'id' | 'project_id'>[]>([]);
  const [vehicleList, setVehicleList] = useState<Omit<ProjectVehicle, 'id' | 'project_id'>[]>([]);
  const [supplyList, setSupplyList] = useState<Omit<ProjectSupply, 'id' | 'project_id'>[]>([]);

  const [laborForm, setLaborForm] = useState({
    laborer_name: '',
    skill_level: 'medium' as 'low' | 'medium' | 'high',
    hours_worked: '',
    hourly_rate: '15',
  });

  const [equipmentForm, setEquipmentForm] = useState({
    equipment_type: '',
    hours_used: '',
    cost_per_hour: '0',
  });

  const [vehicleForm, setVehicleForm] = useState({
    vehicle_type: '',
    hours_used: '',
    mileage: '',
    cost_per_hour: '0',
    cost_per_mile: '0',
  });

  const [supplyForm, setSupplyForm] = useState({
    supply_type: '',
    quantity: '',
    unit: '',
    cost_per_unit: '0',
  });

  const [showLaborerDropdown, setShowLaborerDropdown] = useState(false);
  const [showSkillLevelDropdown, setShowSkillLevelDropdown] = useState(false);

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

  // Calculate estimated cost and profit
  const calculateEstimates = useCallback((
    labor: ProjectLabor[],
    equipment: ProjectEquipment[],
    vehicles: ProjectVehicle[],
    supplies: ProjectSupply[],
    billingAmount: number
  ) => {
    const laborCost = labor.reduce((sum, l) => sum + (l.hours_worked * l.hourly_rate), 0);
    const equipmentCost = equipment.reduce((sum, e) => sum + (e.hours_used * e.cost_per_hour), 0);
    const vehicleCost = vehicles.reduce((sum, v) => sum + (v.hours_used * v.cost_per_hour) + (v.mileage * v.cost_per_mile), 0);
    const supplyCost = supplies.reduce((sum, s) => sum + (s.quantity * s.cost_per_unit), 0);

    const totalCost = laborCost + equipmentCost + vehicleCost + supplyCost;
    const profit = billingAmount - totalCost;

    console.log('Cost Breakdown:', {
      laborCost,
      equipmentCost,
      vehicleCost,
      supplyCost,
      totalCost,
      billingAmount,
      profit
    });

    return { estimatedCost: totalCost, estimatedProfit: profit };
  }, []);

  // Load projects from database
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading projects...');

      const result = await executeQuery<ClientProject>('select', 'client_projects');
      console.log('✓ Loaded projects:', result.length);
      
      setProjects(result);
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

  const loadProjectResources = useCallback(async (projectId: string, billingAmount: number) => {
    try {
      console.log('Loading resources for project:', projectId);

      const [labor, equipment, vehicles, supplies] = await Promise.all([
        executeQuery<ProjectLabor>('select', 'project_labor', undefined, { project_id: projectId }),
        executeQuery<ProjectEquipment>('select', 'project_equipment', undefined, { project_id: projectId }),
        executeQuery<ProjectVehicle>('select', 'project_vehicles', undefined, { project_id: projectId }),
        executeQuery<ProjectSupply>('select', 'project_supplies', undefined, { project_id: projectId }),
      ]);

      setProjectLabor(labor);
      setProjectEquipment(equipment);
      setProjectVehicles(vehicles);
      setProjectSupplies(supplies);

      // Calculate estimates
      const { estimatedCost: cost, estimatedProfit: profit } = calculateEstimates(
        labor,
        equipment,
        vehicles,
        supplies,
        billingAmount
      );

      setEstimatedCost(cost);
      setEstimatedProfit(profit);

      console.log('✓ Loaded resources:', {
        labor: labor.length,
        equipment: equipment.length,
        vehicles: vehicles.length,
        supplies: supplies.length,
        estimatedCost: cost,
        estimatedProfit: profit,
      });
    } catch (error) {
      console.error('Error loading project resources:', error);
      showToast('Failed to load project resources', 'error');
    }
  }, [executeQuery, showToast, calculateEstimates]);

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

  const resetResourceForms = useCallback(() => {
    setLaborForm({
      laborer_name: '',
      skill_level: 'medium',
      hours_worked: '',
      hourly_rate: '15',
    });
    setEquipmentForm({
      equipment_type: '',
      hours_used: '',
      cost_per_hour: '0',
    });
    setVehicleForm({
      vehicle_type: '',
      hours_used: '',
      mileage: '',
      cost_per_hour: '0',
      cost_per_mile: '0',
    });
    setSupplyForm({
      supply_type: '',
      quantity: '',
      unit: '',
      cost_per_unit: '0',
    });
  }, []);

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
      next_scheduled_date: '',
      notes: '',
      work_order_number: '',
      invoice_number: '',
    });
    setLaborList([]);
    setEquipmentList([]);
    setVehicleList([]);
    setSupplyList([]);
    resetResourceForms();
  }, [resetResourceForms]);

  // Add resource to temporary list (for Add/Edit modals)
  const addLaborToList = useCallback(() => {
    if (!laborForm.laborer_name) {
      showToast('Please enter laborer name', 'error');
      return;
    }

    const newLabor = {
      laborer_name: laborForm.laborer_name,
      skill_level: laborForm.skill_level,
      hours_worked: parseFloat(laborForm.hours_worked) || 0,
      hourly_rate: parseFloat(laborForm.hourly_rate) || 15,
      notes: undefined,
    };

    setLaborList([...laborList, newLabor]);
    setLaborForm({
      laborer_name: '',
      skill_level: 'medium',
      hours_worked: '',
      hourly_rate: '15',
    });
    showToast('Labor added to list', 'success');
  }, [laborForm, laborList, showToast]);

  const removeLaborFromList = useCallback((index: number) => {
    setLaborList(laborList.filter((_, i) => i !== index));
  }, [laborList]);

  const addEquipmentToList = useCallback(() => {
    if (!equipmentForm.equipment_type) {
      showToast('Please enter equipment type', 'error');
      return;
    }

    const newEquipment = {
      equipment_type: equipmentForm.equipment_type,
      hours_used: parseFloat(equipmentForm.hours_used) || 0,
      cost_per_hour: parseFloat(equipmentForm.cost_per_hour) || 0,
      notes: undefined,
    };

    setEquipmentList([...equipmentList, newEquipment]);
    setEquipmentForm({
      equipment_type: '',
      hours_used: '',
      cost_per_hour: '0',
    });
    showToast('Equipment added to list', 'success');
  }, [equipmentForm, equipmentList, showToast]);

  const removeEquipmentFromList = useCallback((index: number) => {
    setEquipmentList(equipmentList.filter((_, i) => i !== index));
  }, [equipmentList]);

  const addVehicleToList = useCallback(() => {
    if (!vehicleForm.vehicle_type) {
      showToast('Please enter vehicle type', 'error');
      return;
    }

    const newVehicle = {
      vehicle_type: vehicleForm.vehicle_type,
      hours_used: parseFloat(vehicleForm.hours_used) || 0,
      mileage: parseFloat(vehicleForm.mileage) || 0,
      cost_per_hour: parseFloat(vehicleForm.cost_per_hour) || 0,
      cost_per_mile: parseFloat(vehicleForm.cost_per_mile) || 0,
      notes: undefined,
    };

    setVehicleList([...vehicleList, newVehicle]);
    setVehicleForm({
      vehicle_type: '',
      hours_used: '',
      mileage: '',
      cost_per_hour: '0',
      cost_per_mile: '0',
    });
    showToast('Vehicle added to list', 'success');
  }, [vehicleForm, vehicleList, showToast]);

  const removeVehicleFromList = useCallback((index: number) => {
    setVehicleList(vehicleList.filter((_, i) => i !== index));
  }, [vehicleList]);

  const addSupplyToList = useCallback(() => {
    if (!supplyForm.supply_type) {
      showToast('Please enter supply type', 'error');
      return;
    }

    const newSupply = {
      supply_type: supplyForm.supply_type,
      quantity: parseFloat(supplyForm.quantity) || 0,
      unit: supplyForm.unit,
      cost_per_unit: parseFloat(supplyForm.cost_per_unit) || 0,
      notes: undefined,
    };

    setSupplyList([...supplyList, newSupply]);
    setSupplyForm({
      supply_type: '',
      quantity: '',
      unit: '',
      cost_per_unit: '0',
    });
    showToast('Supply added to list', 'success');
  }, [supplyForm, supplyList, showToast]);

  const removeSupplyFromList = useCallback((index: number) => {
    setSupplyList(supplyList.filter((_, i) => i !== index));
  }, [supplyList]);

  const handleAddProject = useCallback(async () => {
    try {
      if (!formData.client_name || !formData.project_name) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      console.log('Adding project...');

      const projectId = `project-${Date.now()}`;
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
        next_scheduled_date: formData.next_scheduled_date || undefined,
        notes: formData.notes || undefined,
        work_order_number: formData.work_order_number || undefined,
        invoice_number: formData.invoice_number || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await executeQuery<ClientProject>('insert', 'client_projects', newProject);

      // Insert resources
      if (laborList.length > 0) {
        const laborRecords = laborList.map((labor, index) => ({
          id: `labor-${projectId}-${index}`,
          project_id: projectId,
          ...labor,
        }));
        await executeQuery<ProjectLabor>('insert', 'project_labor', laborRecords);
      }

      if (equipmentList.length > 0) {
        const equipmentRecords = equipmentList.map((equipment, index) => ({
          id: `equipment-${projectId}-${index}`,
          project_id: projectId,
          ...equipment,
        }));
        await executeQuery<ProjectEquipment>('insert', 'project_equipment', equipmentRecords);
      }

      if (vehicleList.length > 0) {
        const vehicleRecords = vehicleList.map((vehicle, index) => ({
          id: `vehicle-${projectId}-${index}`,
          project_id: projectId,
          ...vehicle,
        }));
        await executeQuery<ProjectVehicle>('insert', 'project_vehicles', vehicleRecords);
      }

      if (supplyList.length > 0) {
        const supplyRecords = supplyList.map((supply, index) => ({
          id: `supply-${projectId}-${index}`,
          project_id: projectId,
          ...supply,
        }));
        await executeQuery<ProjectSupply>('insert', 'project_supplies', supplyRecords);
      }

      console.log('✓ Project added successfully with resources');
      showToast('Project added successfully', 'success');
      
      await loadProjects();
      
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding project:', error);
      showToast(`Failed to add project: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [formData, laborList, equipmentList, vehicleList, supplyList, executeQuery, showToast, loadProjects, resetForm]);

  const handleUpdateProject = useCallback(async () => {
    try {
      if (!selectedProject || !formData.client_name || !formData.project_name) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      console.log('Updating project...');

      const updatedProject = {
        client_name: formData.client_name,
        building_name: formData.building_name || undefined,
        project_name: formData.project_name,
        description: formData.description || undefined,
        frequency: formData.frequency,
        is_included_in_contract: formData.is_included_in_contract,
        billing_amount: parseFloat(formData.billing_amount) || 0,
        status: formData.status,
        next_scheduled_date: formData.next_scheduled_date || undefined,
        notes: formData.notes || undefined,
        work_order_number: formData.work_order_number || undefined,
        invoice_number: formData.invoice_number || undefined,
        updated_at: new Date().toISOString(),
      };

      await executeQuery<ClientProject>(
        'update',
        'client_projects',
        updatedProject,
        { id: selectedProject.id }
      );

      // Delete existing resources
      await executeQuery<ProjectLabor>('delete', 'project_labor', undefined, { project_id: selectedProject.id });
      await executeQuery<ProjectEquipment>('delete', 'project_equipment', undefined, { project_id: selectedProject.id });
      await executeQuery<ProjectVehicle>('delete', 'project_vehicles', undefined, { project_id: selectedProject.id });
      await executeQuery<ProjectSupply>('delete', 'project_supplies', undefined, { project_id: selectedProject.id });

      // Insert new resources
      if (laborList.length > 0) {
        const laborRecords = laborList.map((labor, index) => ({
          id: `labor-${selectedProject.id}-${Date.now()}-${index}`,
          project_id: selectedProject.id,
          ...labor,
        }));
        await executeQuery<ProjectLabor>('insert', 'project_labor', laborRecords);
      }

      if (equipmentList.length > 0) {
        const equipmentRecords = equipmentList.map((equipment, index) => ({
          id: `equipment-${selectedProject.id}-${Date.now()}-${index}`,
          project_id: selectedProject.id,
          ...equipment,
        }));
        await executeQuery<ProjectEquipment>('insert', 'project_equipment', equipmentRecords);
      }

      if (vehicleList.length > 0) {
        const vehicleRecords = vehicleList.map((vehicle, index) => ({
          id: `vehicle-${selectedProject.id}-${Date.now()}-${index}`,
          project_id: selectedProject.id,
          ...vehicle,
        }));
        await executeQuery<ProjectVehicle>('insert', 'project_vehicles', vehicleRecords);
      }

      if (supplyList.length > 0) {
        const supplyRecords = supplyList.map((supply, index) => ({
          id: `supply-${selectedProject.id}-${Date.now()}-${index}`,
          project_id: selectedProject.id,
          ...supply,
        }));
        await executeQuery<ProjectSupply>('insert', 'project_supplies', supplyRecords);
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
  }, [selectedProject, formData, laborList, equipmentList, vehicleList, supplyList, executeQuery, showToast, loadProjects, resetForm]);

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
              
              // Delete resources first
              await executeQuery<ProjectLabor>('delete', 'project_labor', undefined, { project_id: projectId });
              await executeQuery<ProjectEquipment>('delete', 'project_equipment', undefined, { project_id: projectId });
              await executeQuery<ProjectVehicle>('delete', 'project_vehicles', undefined, { project_id: projectId });
              await executeQuery<ProjectSupply>('delete', 'project_supplies', undefined, { project_id: projectId });
              
              // Delete project
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
    setFormData({
      client_name: project.client_name,
      building_name: project.building_name || '',
      project_name: project.project_name,
      description: project.description || '',
      frequency: project.frequency,
      is_included_in_contract: project.is_included_in_contract,
      billing_amount: project.billing_amount.toString(),
      status: project.status,
      next_scheduled_date: project.next_scheduled_date || '',
      notes: project.notes || '',
      work_order_number: project.work_order_number || '',
      invoice_number: project.invoice_number || '',
    });

    // Load existing resources
    try {
      const [labor, equipment, vehicles, supplies] = await Promise.all([
        executeQuery<ProjectLabor>('select', 'project_labor', undefined, { project_id: project.id }),
        executeQuery<ProjectEquipment>('select', 'project_equipment', undefined, { project_id: project.id }),
        executeQuery<ProjectVehicle>('select', 'project_vehicles', undefined, { project_id: project.id }),
        executeQuery<ProjectSupply>('select', 'project_supplies', undefined, { project_id: project.id }),
      ]);

      setLaborList(labor.map(({ id, project_id, ...rest }) => rest));
      setEquipmentList(equipment.map(({ id, project_id, ...rest }) => rest));
      setVehicleList(vehicles.map(({ id, project_id, ...rest }) => rest));
      setSupplyList(supplies.map(({ id, project_id, ...rest }) => rest));
    } catch (error) {
      console.error('Error loading resources for edit:', error);
    }

    setShowEditModal(true);
  }, [executeQuery]);

  const openDetailsModal = useCallback((project: ClientProject) => {
    console.log('Opening details modal for project:', project.id);
    setSelectedProject(project);
    loadProjectCompletions(project.id);
    loadProjectResources(project.id, project.billing_amount);
    setShowDetailsModal(true);
  }, [loadProjectCompletions, loadProjectResources]);

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

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return '#90EE90';
      case 'medium':
        return '#FFD700';
      case 'high':
        return '#FF6B6B';
      default:
        return colors.textSecondary;
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

  // Get buildings for selected client
  const getClientBuildings = useCallback(() => {
    if (!formData.client_name) return [];
    return clientBuildings.filter(b => b.clientName === formData.client_name);
  }, [formData.client_name, clientBuildings]);

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
      maxHeight: '90%',
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
      marginBottom: spacing.sm,
    },
    modalSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
      marginTop: spacing.lg,
      marginBottom: spacing.md,
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
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    inputTouchable: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
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
      marginBottom: spacing.sm,
    },
    dropdownScroll: {
      maxHeight: 200,
    },
    dropdownItem: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
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
      marginVertical: spacing.sm,
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
    resourceSection: {
      marginBottom: spacing.lg,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    addResourceForm: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    resourceItem: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resourceItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    resourceItemName: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
      flex: 1,
    },
    resourceItemDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      alignItems: 'center',
    },
    resourceItemText: {
      ...typography.small,
      color: colors.textSecondary,
    },
    resourceItemTotal: {
      ...typography.body,
      color: themeColor,
      fontWeight: '600',
      marginLeft: 'auto',
    },
    skillBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 8,
    },
    skillBadgeText: {
      ...typography.small,
      fontWeight: '700',
      fontSize: 10,
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
    costSummary: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      padding: spacing.lg,
      marginTop: spacing.md,
      borderWidth: 2,
      borderColor: themeColor,
    },
    costSummaryTitle: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    costRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    costRowTotal: {
      borderTopWidth: 2,
      borderTopColor: themeColor,
      borderBottomWidth: 0,
      marginTop: spacing.sm,
      paddingTop: spacing.md,
    },
    costLabel: {
      ...typography.body,
      color: colors.text,
      fontWeight: '500',
    },
    costLabelTotal: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '700',
    },
    costValue: {
      ...typography.body,
      color: themeColor,
      fontWeight: '600',
    },
    costValueTotal: {
      ...typography.h2,
      fontWeight: '700',
    },
    profitPositive: {
      color: colors.success,
    },
    profitNegative: {
      color: colors.danger,
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
                    <Text style={styles.projectName}>{project.project_name}</Text>
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

      {/* Add/Edit Modal - Simplified for now */}
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
              <Text style={styles.inputLabel}>Client Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.client_name}
                onChangeText={(text) => setFormData({ ...formData, client_name: text })}
                placeholder="Enter client name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Building Name</Text>
              <TextInput
                style={styles.input}
                value={formData.building_name}
                onChangeText={(text) => setFormData({ ...formData, building_name: text })}
                placeholder="Enter building name"
                placeholderTextColor={colors.textSecondary}
              />

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

              <Text style={styles.inputLabel}>Billing Amount</Text>
              <TextInput
                style={styles.input}
                value={formData.billing_amount}
                onChangeText={(text) => setFormData({ ...formData, billing_amount: text })}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Included in Contract</Text>
                <Switch
                  value={formData.is_included_in_contract}
                  onValueChange={(value) => setFormData({ ...formData, is_included_in_contract: value })}
                  trackColor={{ false: colors.border, true: themeColor }}
                  thumbColor={colors.background}
                />
              </View>
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
                onPress={showAddModal ? handleAddProject : handleUpdateProject}
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
                    <Text style={styles.detailLabel}>Frequency:</Text>
                    <Text style={styles.detailValue}>{getFrequencyLabel(selectedProject.frequency)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Billing:</Text>
                    <Text style={styles.detailValue}>
                      {selectedProject.is_included_in_contract ? 'Included' : `$${selectedProject.billing_amount.toFixed(2)}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.costSummary}>
                  <Text style={styles.costSummaryTitle}>Cost Summary</Text>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Estimated Cost:</Text>
                    <Text style={styles.costValue}>${estimatedCost.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.costRow, styles.costRowTotal]}>
                    <Text style={styles.costLabelTotal}>Estimated Profit:</Text>
                    <Text style={[
                      styles.costValueTotal,
                      estimatedProfit >= 0 ? styles.profitPositive : styles.profitNegative
                    ]}>
                      ${estimatedProfit.toFixed(2)}
                    </Text>
                  </View>
                </View>
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

      <Toast />
    </View>
  );
};

export default ProjectsScreen;
