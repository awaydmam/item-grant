import { supabase } from "@/integrations/supabase/client";

interface UpdateItemStatusParams {
  requestId: string;
  newStatus: 'active' | 'completed';
}

export const updateItemAvailability = async ({ requestId, newStatus }: UpdateItemStatusParams) => {
  try {
    // Get request items
    const { data: requestItems, error: requestError } = await supabase
      .from("request_items")
      .select(`
        item_id,
        quantity,
        items (
          id,
          name,
          available_quantity,
          quantity
        )
      `)
      .eq("request_id", requestId);

    if (requestError) throw requestError;

    // Update availability based on status
    for (const requestItem of requestItems || []) {
      const item = requestItem.items;
      if (!item) continue;

      let newAvailableQuantity: number;
      let itemStatus: 'available' | 'reserved' | 'borrowed' | 'maintenance' | 'damaged' | 'lost';

      if (newStatus === 'active') {
        // Starting loan - reduce available quantity
        newAvailableQuantity = item.available_quantity - requestItem.quantity;
        itemStatus = newAvailableQuantity === 0 ? 'borrowed' : 'available';
      } else {
        // Completing loan - restore available quantity
        newAvailableQuantity = item.available_quantity + requestItem.quantity;
        itemStatus = 'available';
      }

      // Update item availability
      const { error: updateError } = await supabase
        .from("items")
        .update({
          available_quantity: newAvailableQuantity,
          status: itemStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", item.id);

      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating item availability:", error);
    return { success: false, error };
  }
};

export const startLoanProcess = async (requestId: string) => {
  try {
    // Update request status to active
    const { error: statusError } = await supabase
      .from("borrow_requests")
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (statusError) throw statusError;

    // Update item availability
    const availabilityResult = await updateItemAvailability({ 
      requestId, 
      newStatus: 'active' 
    });
    
    if (!availabilityResult.success) {
      throw availabilityResult.error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error starting loan process:", error);
    return { success: false, error };
  }
};

export const completeLoanProcess = async (requestId: string) => {
  try {
    // Update request status to completed
    const { error: statusError } = await supabase
      .from("borrow_requests")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (statusError) throw statusError;

    // Update item availability
    const availabilityResult = await updateItemAvailability({ 
      requestId, 
      newStatus: 'completed' 
    });
    
    if (!availabilityResult.success) {
      throw availabilityResult.error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error completing loan process:", error);
    return { success: false, error };
  }
};