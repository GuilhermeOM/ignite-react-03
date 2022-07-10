import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const isInCart = cart.find(product => product.id === productId);
      const stock: Stock = await api.get(`/stock/${productId}`).then(response => response.data);

      let shouldAlert = false;

      if (isInCart) {
        const newCartState = [...cart];

        newCartState.forEach(product => {
          if (product.id === productId) {
            product.amount >= stock.amount ?
              shouldAlert = true : product.amount += 1;
          }
        });

        if (shouldAlert) {
          toast.error('Quantidade solicitada fora de estoque');
        } else {
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartState));
          setCart(newCartState);
        }
      } else {
        const product: Product = await api.get(`/products/${productId}`).then(response => response.data);

        localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart, { ...product, amount: 1 }]));
        setCart([...cart, { ...product, amount: 1 }]);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCartState = cart.filter(product => product.id !== productId);

      if (newCartState.length >= cart.length) {
        throw Error();
      }

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartState));
      setCart(newCartState);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw Error();
      }

      const stock: Stock = await api.get(`/stock/${productId}`).then(response => response.data);
      const newCartState = [...cart];

      let shouldAlert = false;

      newCartState.forEach(product => {
        if (productId === product.id) {
          const canAddToCart = stock.amount >= amount && amount > product.amount;
          const canRemoveFromCart = stock.amount >= amount && amount < product.amount;

          canAddToCart ? product.amount += 1
          : canRemoveFromCart ? product.amount -= 1
            : shouldAlert = true;
        }
      });

      if (shouldAlert) {
        return toast.error('Quantidade solicitada fora de estoque');
      }

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCartState));
      setCart(newCartState);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
