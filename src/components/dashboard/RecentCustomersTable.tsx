import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Download, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderDetailsDialog } from "./OrderDetailsDialog";

interface Customer {
  id: string;
  orderId: string;
  offer: string;
  client: string;
  phone: string;
  email: string;
  createdAt: string;
  value: string;
  status: "Pago" | "Pendente" | "Reembolso" | "Chargeback";
  productName: string;
  productImageUrl: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fullCreatedAt: string;
}

interface RecentCustomersTableProps {
  customers: Customer[];
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 10;

export function RecentCustomersTable({ customers, isLoading = false }: RecentCustomersTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar clientes por termo de busca
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers.filter(customer => 
      customer.id.toLowerCase().includes(term) ||
      customer.client.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      customer.offer.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  // Calcular total de páginas
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);

  // Obter clientes da página atual
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, currentPage]);

  // Calcular range de páginas a exibir
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Mostrar todas as páginas se forem 5 ou menos
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar páginas com ellipsis
      if (currentPage <= 3) {
        // Início: 1 2 3 4 5
        for (let i = 1; i <= maxPagesToShow; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        // Fim: (total-4) (total-3) (total-2) (total-1) total
        for (let i = totalPages - maxPagesToShow + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Meio: (current-2) (current-1) current (current+1) (current+2)
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }
    
    return pages;
  }, [currentPage, totalPages]);

  const handleViewDetails = (customer: Customer) => {
    setSelectedOrder(customer);
    setIsDialogOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset para página 1 quando busca mudar
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <>
      <OrderDetailsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        orderData={selectedOrder ? {
          id: selectedOrder.orderId,
          customerName: selectedOrder.customerName,
          customerEmail: selectedOrder.customerEmail,
          customerPhone: selectedOrder.customerPhone,
          productName: selectedOrder.productName,
          productImageUrl: selectedOrder.productImageUrl,
          amount: selectedOrder.value,
          status: selectedOrder.status,
          createdAt: selectedOrder.createdAt,
        } : null}
      />
      <Card className="p-6 border-border/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Últimos Clientes</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ color: 'var(--text)' }}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar lista
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead style={{ color: 'var(--subtext)' }}>ID</TableHead>
                <TableHead style={{ color: 'var(--subtext)' }}>Oferta</TableHead>
                <TableHead style={{ color: 'var(--subtext)' }}>Cliente</TableHead>
                <TableHead style={{ color: 'var(--subtext)' }}>Telefone</TableHead>
                <TableHead style={{ color: 'var(--subtext)' }}>Criado em</TableHead>
                <TableHead style={{ color: 'var(--subtext)' }}>Valor</TableHead>
                <TableHead style={{ color: 'var(--subtext)' }}>Status</TableHead>
                <TableHead style={{ color: 'var(--subtext)' }}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2" style={{ color: 'var(--subtext)' }}>
                      <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <p className="text-base font-medium" style={{ color: 'var(--text)' }}>
                        {searchTerm ? "Nenhum resultado encontrado" : "Nenhum cliente ainda"}
                      </p>
                      <p className="text-sm">
                        {searchTerm ? "Tente ajustar sua busca" : "Quando você tiver clientes, eles aparecerão aqui com suas compras."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm" style={{ color: 'var(--text)' }}>{customer.id}</TableCell>
                  <TableCell className="text-sm" style={{ color: 'var(--text)' }}>{customer.offer}</TableCell>
                  <TableCell className="text-sm" style={{ color: 'var(--text)' }}>{customer.client}</TableCell>
                  <TableCell className="text-sm" style={{ color: 'var(--text)' }}>{customer.phone}</TableCell>
                  <TableCell className="text-sm" style={{ color: 'var(--text)' }}>{customer.createdAt}</TableCell>
                  <TableCell className="text-sm" style={{ color: 'var(--text)' }}>{customer.value}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={customer.status === "Pago" ? "default" : "secondary"}
                      className={customer.status === "Pago" ? "bg-success/20 text-success hover:bg-success/30" : ""}
                    >
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 hover:bg-primary/10 transition-colors"
                      onClick={() => handleViewDetails(customer)}
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && filteredCustomers.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)} de {filteredCustomers.length} registros
            </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={handlePrevious}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            {pageNumbers.map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className={page === currentPage ? "bg-primary" : ""}
              >
                {page}
              </Button>
            ))}
            <Button 
              variant="ghost" 
              size="sm"
              disabled={currentPage === totalPages}
              onClick={handleNext}
              className="gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          </div>
        )}
      </div>
    </Card>
    </>
  );
}
