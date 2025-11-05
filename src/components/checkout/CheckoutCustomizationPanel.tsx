import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckoutComponent, CheckoutDesign, CheckoutRow, LayoutType } from "@/pages/CheckoutCustomizer";
import { ArrowLeft, Trash2, Columns, Columns2, Columns3, LayoutGrid, Copy, MoveUp, MoveDown } from "lucide-react";
import { CheckoutColorSettings } from "./CheckoutColorSettings";
import { TypeIcon, ImageIcon, CheckCircleIcon, AwardIcon, TimerIcon, QuoteIcon, VideoIcon } from "@/components/icons";
import { useDraggable } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutCustomizationPanelProps {
  customization: any;
  selectedComponent: CheckoutComponent | null;
  onUpdateComponent: (componentId: string, content: any) => void;
  onRemoveComponent: (componentId: string) => void;
  onDuplicateComponent?: (componentId: string) => void;
  onMoveComponentUp?: (componentId: string) => void;
  onMoveComponentDown?: (componentId: string) => void;
  onUpdateDesign: (design: CheckoutDesign) => void;
  onAddRow: (layout: LayoutType) => void;
  onRemoveRow: (rowId: string) => void;
  onBack: () => void;
  rows: CheckoutRow[];
  selectedRowId: string | null;
}

const DraggableComponent = ({ type, icon, label }: { type: string; icon: React.ReactNode; label: string }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: type,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? "opacity-50 scale-95" : "hover:border-primary hover:bg-primary/5"
      }`}
    >
      {icon}
      <span className="text-sm mt-2">{label}</span>
    </div>
  );
};

export const CheckoutCustomizationPanel = ({
  customization,
  selectedComponent,
  onUpdateComponent,
  onRemoveComponent,
  onDuplicateComponent,
  onMoveComponentUp,
  onMoveComponentDown,
  onUpdateDesign,
  onAddRow,
  onRemoveRow,
  onBack,
  rows,
  selectedRowId,
}: CheckoutCustomizationPanelProps) => {
  const [activeTab, setActiveTab] = useState("components");

  const handleDesignUpdate = (field: string, value: any) => {
    // Se o campo é 'design.colors.ALGUMA_COR', marca como tema custom
    if (field.startsWith('design.colors.') && field !== 'design') {
      // Usuário editou uma cor individual → marca como custom
      const newDesign = { ...customization.design };
      
      // Atualiza o valor usando dot notation
      const keys = field.replace('design.', '').split('.');
      let current: any = newDesign;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      // Marca como custom (usuário customizou uma cor)
      newDesign.theme = 'custom';
      
      onUpdateDesign(newDesign);
      
    } else if (field === 'design') {
      // Usuário trocou o tema inteiro (light/dark) → aplica preset completo
      onUpdateDesign(value);
      
    } else if (field === 'design.theme') {
      // Apenas mudança de tema sem preset (custom)
      onUpdateDesign({
        ...customization.design,
        theme: value,
      });
      
    } else if (field === 'design.font') {
      // Mudança de fonte
      onUpdateDesign({
        ...customization.design,
        font: value,
      });
    }
  };

  if (selectedComponent) {
    return (
      <div className="w-96 border-l bg-card p-6 overflow-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold capitalize">Editar {selectedComponent.type}</h3>
        </div>

        <div className="space-y-4">
          {selectedComponent.type === "text" && (
            <>
              <div>
                <Label>Texto</Label>
                <Input
                  value={selectedComponent.content?.text || ""}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      text: e.target.value,
                    })
                  }
                  placeholder="Digite o texto"
                />
              </div>
              <div>
                <Label>Tamanho da Fonte</Label>
                <Input
                  type="number"
                  value={selectedComponent.content?.fontSize || 16}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      fontSize: parseInt(e.target.value),
                    })
                  }
                  min={12}
                  max={48}
                />
              </div>
              <div>
                <Label>Cor do Texto</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedComponent.content?.color || "#000000"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        color: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={selectedComponent.content?.color || "#000000"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        color: e.target.value,
                      })
                    }
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div>
                <Label>Cor do Fundo</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedComponent.content?.backgroundColor || "#FFFFFF"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        backgroundColor: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={selectedComponent.content?.backgroundColor || "#FFFFFF"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        backgroundColor: e.target.value,
                      })
                    }
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
              <div>
                <Label>Cor da Borda</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedComponent.content?.borderColor || "#E5E7EB"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        borderColor: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={selectedComponent.content?.borderColor || "#E5E7EB"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        borderColor: e.target.value,
                      })
                    }
                    placeholder="#E5E7EB"
                  />
                </div>
              </div>
              <div>
                <Label>Largura da Borda (px)</Label>
                <Input
                  type="number"
                  value={selectedComponent.content?.borderWidth || 1}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      borderWidth: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                  max={10}
                  placeholder="1"
                />
              </div>
              <div>
                <Label>Raio da Borda (px)</Label>
                <Input
                  type="number"
                  value={selectedComponent.content?.borderRadius || 8}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      borderRadius: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                  max={50}
                  placeholder="8"
                />
              </div>
            </>
          )}

          {selectedComponent.type === "image" && (() => {
            const imageInputId = `image-upload-${selectedComponent.id}`;
            const isUploading = selectedComponent.content?._uploading === true;

            const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              // 1. Validações
              if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione uma imagem válida (JPG/PNG).');
                return;
              }
              if (file.size > 10 * 1024 * 1024) {
                alert('Imagem muito grande (máx. 10MB).');
                return;
              }

              // 2. Preview imediato e marca uploading
              const previewUrl = URL.createObjectURL(file);
              onUpdateComponent(selectedComponent.id, {
                ...selectedComponent.content,
                imageUrl: previewUrl,   // preview local
                _preview: true,
                _uploading: true,
                _uploadError: false,
                _fileName: file.name,
                _old_storage_path: selectedComponent.content?._storage_path, // Guarda o path antigo para deletar depois do save
              });

              // 3. Upload para Supabase em background
              try {
                const fileExt = file.name.split('.').pop();
                const fileName = `checkout-components/${selectedComponent.id}-${Date.now()}.${fileExt}`;

                // Fazer upload ao bucket 'product-images'
                const { error: uploadError } = await supabase.storage
                  .from('product-images')
                  .upload(fileName, file, { upsert: true });

                if (uploadError) throw uploadError;

                // Pegar URL pública
                const { data } = supabase.storage
                  .from('product-images')
                  .getPublicUrl(fileName);

                const publicUrl = data?.publicUrl || null;
                if (!publicUrl) throw new Error('Public URL não retornada');

                // 4. Atualizar componente com a URL pública e storage_path
                onUpdateComponent(selectedComponent.id, {
                  ...selectedComponent.content,
                  imageUrl: publicUrl,
                  url: publicUrl,
                  _storage_path: fileName, // Novo storage path
                  _uploading: false,
                  _preview: false,
                });

                // 5. Revogar preview blob
                setTimeout(() => {
                  try { URL.revokeObjectURL(previewUrl); } catch (e) { /* ignore */ }
                }, 2000);

              } catch (err: any) {
                console.error("Upload da imagem falhou:", err);
                onUpdateComponent(selectedComponent.id, {
                  ...selectedComponent.content,
                  _uploading: false,
                  _uploadError: true,
                  _old_storage_path: null, // Não deletar o antigo
                });
                alert("Falha ao enviar imagem. Tente novamente.");
              }
            };
            
            return (
            <>
              <div>
                <Label>Arraste ou selecione o arquivo</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                    id={imageInputId}
                    disabled={isUploading}
                  />
                  <label htmlFor={imageInputId} className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className="text-gray-500">
                      {isUploading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-sm">Enviando imagem...</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">Solte os arquivos aqui ou clique para fazer upload</p>
                          <p className="text-xs mt-1">Formatos aceitos: JPG ou PNG. Tamanho máximo: 10MB</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <Label>Alinhamento</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectedComponent.content?.alignment === "left" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        alignment: "left",
                      })
                    }
                    className="flex-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="3" y1="12" x2="15" y2="12"/>
                      <line x1="3" y1="18" x2="18" y2="18"/>
                    </svg>
                  </Button>
                  <Button
                    type="button"
                    variant={selectedComponent.content?.alignment === "center" || !selectedComponent.content?.alignment ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        alignment: "center",
                      })
                    }
                    className="flex-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="6" y1="12" x2="18" y2="12"/>
                      <line x1="4" y1="18" x2="20" y2="18"/>
                    </svg>
                  </Button>
                  <Button
                    type="button"
                    variant={selectedComponent.content?.alignment === "right" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        alignment: "right",
                      })
                    }
                    className="flex-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="9" y1="12" x2="21" y2="12"/>
                      <line x1="6" y1="18" x2="21" y2="18"/>
                    </svg>
                  </Button>
                </div>
              </div>
              <div>
                <Label>URL da Imagem (opcional)</Label>
                <Input
                  value={selectedComponent.content?.imageUrl || ""}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      imageUrl: e.target.value,
                    })
                  }
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
            </>
            );
          })()}

          {selectedComponent.type === "advantage" && (
            <>
              <div>
                <Label>Ícone</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { value: "at", icon: "@" },
                    { value: "chart", icon: "📈" },
                    { value: "message", icon: "💬" },
                    { value: "cursor", icon: "👆" },
                    { value: "cloud", icon: "☁️" },
                    { value: "download", icon: "⬇️" },
                    { value: "file", icon: "📄" },
                    { value: "heart", icon: "❤️" },
                    { value: "users", icon: "👥" },
                    { value: "play", icon: "▶️" },
                    { value: "check", icon: "✔️" },
                    { value: "globe", icon: "🌐" },
                  ].map((iconOption) => (
                    <Button
                      key={iconOption.value}
                      type="button"
                      variant={(selectedComponent.content?.icon || "check") === iconOption.value ? "default" : "outline"}
                      className="h-12 text-xl"
                      onClick={() =>
                        onUpdateComponent(selectedComponent.id, {
                          ...selectedComponent.content,
                          icon: iconOption.value,
                        })
                      }
                    >
                      {iconOption.icon}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Cor principal</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedComponent.content?.primaryColor || "#1DB88E"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        primaryColor: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={selectedComponent.content?.primaryColor || "#1DB88E"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        primaryColor: e.target.value,
                      })
                    }
                    placeholder="#1DB88E"
                  />
                </div>
              </div>
              <div>
                <Label>Cor do título</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedComponent.content?.titleColor || "#000000"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        titleColor: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={selectedComponent.content?.titleColor || "#000000"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        titleColor: e.target.value,
                      })
                    }
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div>
                <Label>Tamanho</Label>
                <Select
                  value={selectedComponent.content?.size || "original"}
                  onValueChange={(value) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      size: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequeno</SelectItem>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Modo escuro</Label>
                <input
                  type="checkbox"
                  checked={selectedComponent.content?.darkMode || false}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      darkMode: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Modo Vertical</Label>
                <input
                  type="checkbox"
                  checked={selectedComponent.content?.verticalMode || false}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      verticalMode: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
              </div>
              <div>
                <Label>Título</Label>
                <Input
                  value={selectedComponent.content?.title || ""}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      title: e.target.value,
                    })
                  }
                  placeholder="Vantagem"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={selectedComponent.content?.description || ""}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descrição da vantagem"
                />
              </div>
            </>
          )}

          {selectedComponent.type === "seal" && (
            <>
              <div>
                <Label>Selecione um preset</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={(selectedComponent.content?.preset || "privacy") === "privacy" ? "default" : "outline"}
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, {
                        preset: "privacy",
                        topText: "7",
                        title: "Privacidade",
                        subtitle: "Garantida",
                        primaryColor: "#4F9EF8",
                        titleColor: "#FFFFFF",
                      })
                    }
                  >
                    <div className="text-xs font-bold" style={{ color: "#4F9EF8" }}>Privacidade</div>
                    <div className="text-xs">Garantida</div>
                  </Button>
                  <Button
                    type="button"
                    variant={(selectedComponent.content?.preset) === "guarantee" ? "default" : "outline"}
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, {
                        preset: "guarantee",
                        topText: "7",
                        title: "100%",
                        subtitle: "DE GARANTIA",
                        primaryColor: "#E74C3C",
                        titleColor: "#FFFFFF",
                      })
                    }
                  >
                    <div className="text-xs font-bold" style={{ color: "#E74C3C" }}>100%</div>
                    <div className="text-xs">Garantia</div>
                  </Button>
                  <Button
                    type="button"
                    variant={(selectedComponent.content?.preset) === "days" ? "default" : "outline"}
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, {
                        preset: "days",
                        topText: "7",
                        title: "DIAS",
                        subtitle: "DE GARANTIA",
                        primaryColor: "#F1C40F",
                        titleColor: "#000000",
                      })
                    }
                  >
                    <div className="text-xs font-bold" style={{ color: "#F1C40F" }}>7 DIAS</div>
                    <div className="text-xs">Garantia</div>
                  </Button>
                </div>
              </div>
              <div>
                <Label>Texto superior</Label>
                <Input
                  value={selectedComponent.content?.topText || "7"}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      topText: e.target.value,
                    })
                  }
                  placeholder="7"
                />
              </div>
              <div>
                <Label>Título</Label>
                <Input
                  value={selectedComponent.content?.title || "Privacidade"}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      title: e.target.value,
                    })
                  }
                  placeholder="Privacidade"
                />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input
                  value={selectedComponent.content?.subtitle || "Garantida"}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      subtitle: e.target.value,
                    })
                  }
                  placeholder="Garantida"
                />
              </div>
              <div>
                <Label>Cor principal</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedComponent.content?.primaryColor || "#4F9EF8"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        primaryColor: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={selectedComponent.content?.primaryColor || "#4F9EF8"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        primaryColor: e.target.value,
                      })
                    }
                    placeholder="#4F9EF8"
                  />
                </div>
              </div>
              <div>
                <Label>Cor do título</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedComponent.content?.titleColor || "#FFFFFF"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        titleColor: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={selectedComponent.content?.titleColor || "#FFFFFF"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        titleColor: e.target.value,
                      })
                    }
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
              <div>
                <Label>Alinhamento</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectedComponent.content?.alignment === "left" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        alignment: "left",
                      })
                    }
                    className="flex-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="3" y1="12" x2="15" y2="12"/>
                      <line x1="3" y1="18" x2="18" y2="18"/>
                    </svg>
                  </Button>
                  <Button
                    type="button"
                    variant={selectedComponent.content?.alignment === "center" || !selectedComponent.content?.alignment ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        alignment: "center",
                      })
                    }
                    className="flex-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="6" y1="12" x2="18" y2="12"/>
                      <line x1="4" y1="18" x2="20" y2="18"/>
                    </svg>
                  </Button>
                  <Button
                    type="button"
                    variant={selectedComponent.content?.alignment === "right" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        alignment: "right",
                      })
                    }
                    className="flex-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="9" y1="12" x2="21" y2="12"/>
                      <line x1="6" y1="18" x2="21" y2="18"/>
                    </svg>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Modo escuro</Label>
                <input
                  type="checkbox"
                  checked={selectedComponent.content?.darkMode || false}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      darkMode: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
              </div>
            </>
          )}

          {selectedComponent.type === "timer" && (
            <>
              <div>
                <Label>Minutos</Label>
                <Input
                  type="number"
                  value={selectedComponent.content?.minutes || 15}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      minutes: parseInt(e.target.value),
                    })
                  }
                  min={0}
                  max={59}
                />
              </div>
              <div>
                <Label>Segundos</Label>
                <Input
                  type="number"
                  value={selectedComponent.content?.seconds || 0}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      seconds: parseInt(e.target.value),
                    })
                  }
                  min={0}
                  max={59}
                />
              </div>
              <div>
                <Label>Cor de fundo</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedComponent.content?.timerColor || "#10B981"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        timerColor: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={selectedComponent.content?.timerColor || "#10B981"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        timerColor: e.target.value,
                      })
                    }
                    placeholder="#10B981"
                  />
                </div>
              </div>
              <div>
                <Label>Cor do texto</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedComponent.content?.textColor || "#FFFFFF"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        textColor: e.target.value,
                      })
                    }
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={selectedComponent.content?.textColor || "#FFFFFF"}
                    onChange={(e) =>
                      onUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.content,
                        textColor: e.target.value,
                      })
                    }
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
              <div>
                <Label>Texto contagem ativa</Label>
                <Input
                  value={selectedComponent.content?.activeText || "Oferta por tempo limitado"}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      activeText: e.target.value,
                    })
                  }
                  placeholder="Oferta por tempo limitado"
                />
              </div>
              <div>
                <Label>Texto contagem finalizada</Label>
                <Input
                  value={selectedComponent.content?.finishedText || "Oferta finalizada"}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      finishedText: e.target.value,
                    })
                  }
                  placeholder="Oferta finalizada"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fixar-topo"
                  checked={selectedComponent.content?.fixedTop || false}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      fixedTop: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <Label htmlFor="fixar-topo" className="cursor-pointer">Fixar no topo</Label>
              </div>
            </>
          )}

          {selectedComponent.type === "testimonial" && (
            <>
              <div>
                <Label>Texto do Depoimento</Label>
                <Input
                  value={selectedComponent.content?.testimonialText || ""}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      testimonialText: e.target.value,
                    })
                  }
                  placeholder="Depoimento do cliente"
                />
              </div>
              <div>
                <Label>Nome do Autor</Label>
                <Input
                  value={selectedComponent.content?.authorName || ""}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      authorName: e.target.value,
                    })
                  }
                  placeholder="Nome do Cliente"
                />
              </div>
              <div>
                <Label>Foto do Autor (URL)</Label>
                <Input
                  value={selectedComponent.content?.authorImage || ""}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      authorImage: e.target.value,
                    })
                  }
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>
            </>
          )}

          {selectedComponent.type === "video" && (
            <>
              <div>
                <Label>Tipo de Vídeo</Label>
                <Select
                  value={selectedComponent.content?.videoType || "youtube"}
                  onValueChange={(value) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      videoType: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="custom">URL Customizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>URL do Vídeo</Label>
                <Input
                  value={selectedComponent.content?.videoUrl || ""}
                  onChange={(e) =>
                    onUpdateComponent(selectedComponent.id, {
                      ...selectedComponent.content,
                      videoUrl: e.target.value,
                    })
                  }
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </>
          )}

          <div className="space-y-2 pt-4 border-t">
            <div className="grid grid-cols-3 gap-2">
              {onDuplicateComponent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDuplicateComponent(selectedComponent.id)}
                  title="Duplicar componente"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              {onMoveComponentUp && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMoveComponentUp(selectedComponent.id)}
                  title="Mover para cima"
                >
                  <MoveUp className="h-4 w-4" />
                </Button>
              )}
              {onMoveComponentDown && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMoveComponentDown(selectedComponent.id)}
                  title="Mover para baixo"
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => onRemoveComponent(selectedComponent.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Componente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l bg-card overflow-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
          <TabsTrigger value="components">Componentes</TabsTrigger>
          <TabsTrigger value="rows">Linhas</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-4">Componentes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Arraste os componentes para o checkout
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DraggableComponent type="text" icon={<TypeIcon size={28} />} label="Texto" />
            <DraggableComponent type="image" icon={<ImageIcon size={28} />} label="Imagem" />
            <DraggableComponent type="advantage" icon={<CheckCircleIcon size={28} />} label="Vantagem" />
            <DraggableComponent type="seal" icon={<AwardIcon size={28} />} label="Selo" />
            <DraggableComponent type="timer" icon={<TimerIcon size={28} />} label="Cronômetro" />
            <DraggableComponent type="testimonial" icon={<QuoteIcon size={28} />} label="Depoimento" />
            <DraggableComponent type="video" icon={<VideoIcon size={28} />} label="Vídeo" />
          </div>
        </TabsContent>

        <TabsContent value="rows" className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-4">Layouts de Linhas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione linhas com diferentes layouts
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onAddRow("single")}
              className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Columns className="h-8 w-8 mb-2" />
              <span className="text-sm">1 Coluna</span>
            </button>

            <button
              onClick={() => onAddRow("two-columns")}
              className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Columns2 className="h-8 w-8 mb-2" />
              <span className="text-sm">2 Colunas</span>
            </button>

            <button
              onClick={() => onAddRow("two-columns-asymmetric")}
              className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
            >
              <LayoutGrid className="h-8 w-8 mb-2" />
              <span className="text-sm">2 Colunas (33/66)</span>
            </button>

            <button
              onClick={() => onAddRow("three-columns")}
              className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
            >
              <Columns3 className="h-8 w-8 mb-2" />
              <span className="text-sm">3 Colunas</span>
            </button>
          </div>

          {rows.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Linhas Adicionadas</h4>
              <div className="space-y-2">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      selectedRowId === row.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <span className="text-sm capitalize">
                      {row.layout === "single" && "1 Coluna"}
                      {row.layout === "two-columns" && "2 Colunas"}
                      {row.layout === "two-columns-asymmetric" && "2 Colunas (33/66)"}
                      {row.layout === "three-columns" && "3 Colunas"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveRow(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-4">Configurações de Design</h3>
            <p className="text-sm text-muted-foreground">
              Personalize as cores e a aparência do seu checkout
            </p>
          </div>

        <CheckoutColorSettings 
          customization={customization}
          onUpdate={handleDesignUpdate}
        />
        </TabsContent>
      </Tabs>
    </div>
  );
};

