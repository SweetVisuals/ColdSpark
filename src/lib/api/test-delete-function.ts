import { supabase } from '../../lib/supabase.js';

interface RpcError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export async function testDeleteFunction() {
  try {
    // Test with a dummy user ID
    const { data, error } = await supabase.rpc('delete_user', {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error) {
      console.error('RPC Error:', error);
      return { error: error as RpcError };
    }

    return { data };
  } catch (error) {
    console.error('Error:', error);
    return { error: { message: error instanceof Error ? error.message : 'Unknown error' } as RpcError };
  }
}
