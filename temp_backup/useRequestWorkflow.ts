import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { CartItem } from './useCart';

export type RequestStatus = 
  | 'draft' 
  | 'pending_owner' 
  | 'pending_headmaster' 
  | 'approved' 
  | 'active' 
  | 'completed' 
  | 'rejected';

export interface BorrowRequest {
  id: string;
  borrower_id: string;
  status: RequestStatus;
  requested_date: string;
  expected_return_date: string;
  actual_return_date?: string;
  purpose: string;
  location_usage: string;
  responsible_person: string;
  contact_info: string;
  notes?: string;
  rejection_reason?: string;
  approval_path: 'direct' | 'via_headmaster';
  letter_number?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  borrower?: {
    id: string;
    full_name: string;
    unit_kerja: string;
  };
  request_items?: {
    id: string;
    item_id: string;
    quantity: number;
    items: {
      id: string;
      name: string;
      code: string;
      image_url?: string;
      department_id: string;
      departments: {
        name: string;
      };
    };
  }[];
}

interface CreateRequestData {
  items: CartItem[];
  requestedDate: string;
  expectedReturnDate: string;
  purpose: string;
  locationUsage: string;
  responsiblePerson: string;
  contactInfo: string;
  notes?: string;
}

export const useRequestWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, canApproveRequests, getUserDepartment } = useUserRole();

  // Create new borrow request
  const createRequest = useCallback(async (data: CreateRequestData): Promise<string | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Create the borrow request
      const { data: request, error: requestError } = await supabase
        .from('borrow_requests')
        .insert({
          borrower_id: user.id,
          status: 'pending_owner',
          requested_date: data.requestedDate,
          expected_return_date: data.expectedReturnDate,
          purpose: data.purpose,
          location_usage: data.locationUsage,
          responsible_person: data.responsiblePerson,
          contact_info: data.contactInfo,
          notes: data.notes,
          approval_path: 'direct' // Default, can be changed by owner
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create request items
      const requestItems = data.items.map(item => ({
        request_id: request.id,
        item_id: item.id,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('request_items')
        .insert(requestItems);

      if (itemsError) throw itemsError;

      return request.id;
    } catch (err) {
      console.error('Error creating request:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get pending requests for owner/admin
  const getPendingRequests = useCallback(async (): Promise<BorrowRequest[]> => {
    if (!canApproveRequests()) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const query = supabase
        .from('borrow_requests')
        .select(`
          *,
          borrower:profiles!borrower_id(id, full_name, unit_kerja),
          request_items(
            id,
            item_id,
            quantity,
            items(
              id,
              name,
              code,
              image_url,
              department_id,
              departments(name)
            )
          )
        `)
        .in('status', ['pending_owner', 'pending_headmaster'])
        .order('created_at', { ascending: false });

      // Filter by department for owners
      const userDept = getUserDepartment();
      if (userDept) {
        // For owners, only show requests for items in their department
        // This requires a more complex query, for now we'll filter after fetch
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error fetching pending requests:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [canApproveRequests, getUserDepartment]);

  // Approve request (owner action)
  const approveRequest = useCallback(async (
    requestId: string, 
    approvalPath: 'direct' | 'via_headmaster',
    notes?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const newStatus = approvalPath === 'direct' ? 'approved' : 'pending_headmaster';
      
      const { error } = await supabase
        .from('borrow_requests')
        .update({
          status: newStatus,
          approval_path: approvalPath,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // If direct approval, generate letter number
      if (approvalPath === 'direct') {
        await generateLetterNumber(requestId);
      }

      return true;
    } catch (err) {
      console.error('Error approving request:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Headmaster final approval
  const headmasterApproval = useCallback(async (
    requestId: string,
    approved: boolean,
    notes?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const updateData: Record<string, string | boolean> = {
        status: approved ? 'approved' : 'rejected',
        notes: notes,
        updated_at: new Date().toISOString()
      };

      if (!approved) {
        updateData.rejection_reason = notes;
      }

      const { error } = await supabase
        .from('borrow_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Generate letter number if approved
      if (approved) {
        await generateLetterNumber(requestId);
      }

      return true;
    } catch (err) {
      console.error('Error in headmaster approval:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reject request
  const rejectRequest = useCallback(async (
    requestId: string,
    reason: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('borrow_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Start loan (activate)
  const startLoan = useCallback(async (requestId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('borrow_requests')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // TODO: Update item availability counts
      
      return true;
    } catch (err) {
      console.error('Error starting loan:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // End loan (complete)
  const endLoan = useCallback(async (
    requestId: string,
    actualReturnDate?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('borrow_requests')
        .update({
          status: 'completed',
          actual_return_date: actualReturnDate || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // TODO: Update item availability counts
      
      return true;
    } catch (err) {
      console.error('Error ending loan:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate letter number
  const generateLetterNumber = async (requestId: string): Promise<void> => {
    try {
      // Get request details for department
      const { data: request, error: requestError } = await supabase
        .from('borrow_requests')
        .select(`
          *,
          request_items(
            items(
              departments(code)
            )
          )
        `)
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Generate letter number: {counter}/{dept}/{month}/{year}
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      
      // Get department code (first department if multiple)
      const deptCode = request.request_items?.[0]?.items?.departments?.code || 'UMUM';
      
      // Get counter for this month/year/department
      const { count } = await supabase
        .from('borrow_requests')
        .select('*', { count: 'exact', head: true })
        .not('letter_number', 'is', null)
        .like('letter_number', `%/${deptCode}/${month}/${year}`);

      const counter = String((count || 0) + 1).padStart(3, '0');
      const letterNumber = `${counter}/${deptCode}/${month}/${year}`;

      // Update request with letter number
      await supabase
        .from('borrow_requests')
        .update({ letter_number: letterNumber })
        .eq('id', requestId);

    } catch (err) {
      console.error('Error generating letter number:', err);
      // Don't throw, as this is supplementary
    }
  };

  return {
    loading,
    error,
    createRequest,
    getPendingRequests,
    approveRequest,
    headmasterApproval,
    rejectRequest,
    startLoan,
    endLoan
  };
};